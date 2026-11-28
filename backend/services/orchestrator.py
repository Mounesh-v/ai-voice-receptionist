"""LangGraph orchestrator for one receptionist turn.

Workflow (per turn):

    START -> load_memory -> decide_route
                |--- appointment --> appointment_node --> END
                `--- rag --> retrieve_rag -> build_context -> generate --> END

- ``load_memory``    recent messages (MongoDB checkpointer thread state,
                     seeded from ``conversation_messages``), the user's
                     rolling summary, long-term facts, and optional
                     semantic snippets from Qdrant.
- ``decide_route``   existing appointment keyword + active-stage routing.
- ``appointment_node`` existing appointment agent + canned reply ladder.
- ``retrieve_rag``   existing business RAG retrieval.
- ``build_context``  token-budgeted assembly (never the full history).
- ``generate``       Groq ``openai/gpt-oss-120b`` with history + memory.

Short-term state is persisted with the MongoDB checkpointer keyed by
``conversation_id`` (thread_id), so a session can be resumed and the
memory layer can inspect it.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from config import (
    MEMORY_CONTEXT_TOKEN_BUDGET,
    MEMORY_ENABLED,
    MEMORY_RECENT_MESSAGES,
    RAG_DEFAULT_BUSINESS_ID,
)
from services.appointment_agent import (
    get_appointment_state,
    process_appointment_message,
)
from services.chat import generate_response
from services.conversation_memory import get_conversation_history
from services.memory import semantic as semantic_memory
from services.memory.context_builder import build_context
from services.memory.stores import get_user_facts, get_user_summary
from services.rag import retrieve_business_context

logger = logging.getLogger(__name__)

DEFAULT_LANGUAGE = "en-IN"

APPOINTMENT_ACTIVE_STAGES = [
    "collecting_details",
    "ready_for_availability",
    "awaiting_doctor_selection",
    "awaiting_time_selection",
    "awaiting_confirmation",
    "awaiting_appointment_selection",
    "awaiting_cancel_confirmation",
    "awaiting_reschedule_selection",
    "awaiting_reschedule_date",
    "awaiting_reschedule_time_selection",
    "awaiting_reschedule_confirmation",
]

APPOINTMENT_KEYWORDS = [
    "book an appointment",
    "book appointment",
    "schedule an appointment",
    "schedule appointment",
    "make an appointment",
    "want an appointment",
    "need an appointment",
    "see a doctor",
    "consult a doctor",
    # Cancellation requests
    "cancel appointment",
    "cancel my appointment",
    "cancel the appointment",
    "cancel booking",
    "cancel my booking",
    "want to cancel",
    "need to cancel",
    "i would like to cancel",
    # Rescheduling requests
    "reschedule appointment",
    "reschedule my appointment",
    "change my appointment",
    "change my booking",
    "postpone my appointment",
    "reschedule my booking",
    "i want to reschedule",
    "i need to reschedule",
    "i would like to reschedule",
    "i'd like to reschedule",
    "change appointment date",
    "change appointment time",
    "change my appointment date",
    "change my appointment time",
    "move my appointment",
    "change my booking date",
]


class TurnState(TypedDict, total=False):
    # Inputs
    user_id: str
    conversation_id: str
    language: str
    language_name: str
    transcript: str
    user_name: str
    user_email: str
    # Memory layer
    messages: list[dict]
    summary: str
    facts: list[str]
    semantic_snippets: list[str]
    # Routing / context
    route: str
    rag_context: str
    memory_context: str
    history: list[dict]
    # Outputs
    response: str
    reply_language: str


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def is_appointment_request(transcript: str) -> bool:
    message = transcript.lower()
    return any(keyword in message for keyword in APPOINTMENT_KEYWORDS)


def _append_exchange(
    messages: list[dict] | None,
    user_text: str,
    ai_text: str,
) -> list[dict]:
    """Append the completed exchange, keeping the newest window."""
    out = [dict(m) for m in (messages or [])]
    out.append({"role": "user", "content": user_text})
    out.append({"role": "assistant", "content": ai_text})
    if len(out) > MEMORY_RECENT_MESSAGES:
        out = out[-MEMORY_RECENT_MESSAGES:]
    return out


def _format_appointment_reply(appointment_state, extracted) -> str:
    """Canned reply ladder (moved verbatim from api/voice.py)."""
    if extracted.clarification_needed:
        return extracted.clarification_needed

    if appointment_state.stage == "collecting_details":
        if (
            not appointment_state.service
            and not appointment_state.appointment_date
        ):
            return (
                "Which department would you like to consult, "
                "and on which date would you like the appointment?"
            )
        if not appointment_state.service:
            return "Which department would you like to consult?"
        return "On which date would you like the appointment?"

    if appointment_state.stage == "awaiting_confirmation":
        if extracted.confirmation is True:
            return (
                "Thank you. I have received your confirmation, "
                "but the appointment booking functionality is "
                "not connected yet. Your appointment has not "
                "been booked."
            )
        if extracted.confirmation is False:
            return (
                "No problem. I haven't booked the appointment. "
                "Would you like to choose a different time?"
            )
        return "Would you like me to confirm this appointment?"

    if appointment_state.stage == "cancelled":
        return "Your appointment has been cancelled successfully."

    if appointment_state.stage == "rescheduled":
        return "Your appointment has been successfully rescheduled."

    return (
        "I'm processing your appointment request. "
        "Could you please provide the requested details?"
    )


# ------------------------------------------------------------------
# Nodes
# ------------------------------------------------------------------

async def load_memory(state: TurnState) -> dict:
    """Load short-term history, summary, facts and semantic snippets."""
    if not MEMORY_ENABLED:
        return {
            "messages": [],
            "summary": "",
            "facts": [],
            "semantic_snippets": [],
        }

    user_id = str(state.get("user_id") or "")
    conversation_id = str(state.get("conversation_id") or "")
    transcript = (state.get("transcript") or "").strip()

    # Short-term: checkpointer state if present, else seed from Mongo.
    prior = state.get("messages") or []
    if not prior:
        try:
            rows = await asyncio.to_thread(
                get_conversation_history,
                conversation_id,
                user_id,
                MEMORY_RECENT_MESSAGES + 2,
            )
            prior = [
                {
                    "role": row.get("role"),
                    "content": row.get("content"),
                }
                for row in rows
                if row.get("role") in ("user", "assistant")
                and row.get("content")
            ]
        except Exception as error:
            logger.warning("memory seed failed: %r", error)
            prior = []

    history = [dict(m) for m in prior]

    # The current transcript may already be persisted (voice.py saves
    # the user message before the turn) - do not show it twice.
    if (
        history
        and history[-1].get("role") == "user"
        and str(history[-1].get("content") or "").strip() == transcript
    ):
        history = history[:-1]

    if len(history) > MEMORY_RECENT_MESSAGES:
        history = history[-MEMORY_RECENT_MESSAGES:]

    # Rolling summary + long-term facts (cross-session, keyed by user).
    try:
        summary = await asyncio.to_thread(get_user_summary, user_id)
    except Exception as error:
        logger.warning("summary load failed: %r", error)
        summary = ""

    try:
        facts = await asyncio.to_thread(get_user_facts, user_id)
    except Exception as error:
        logger.warning("facts load failed: %r", error)
        facts = []

    # Optional semantic retrieval over this user's past exchanges.
    snippets: list[str] = []
    if transcript:
        try:
            snippets = await asyncio.to_thread(
                semantic_memory.search_relevant,
                user_id,
                transcript,
            )
        except Exception as error:
            logger.warning("semantic search failed: %r", error)
            snippets = []

    return {
        "messages": history,
        "summary": summary,
        "facts": facts,
        "semantic_snippets": snippets,
    }


async def decide_route(state: TurnState) -> dict:
    """Appointment flow vs normal RAG question."""
    transcript = state.get("transcript") or ""
    conversation_id = str(state.get("conversation_id") or "")

    existing_appointment = await get_appointment_state(conversation_id)

    appointment_active = (
        existing_appointment is not None
        and existing_appointment.stage in APPOINTMENT_ACTIVE_STAGES
    )

    route = (
        "appointment"
        if (is_appointment_request(transcript) or appointment_active)
        else "rag"
    )

    return {"route": route}


async def appointment_node(state: TurnState) -> dict:
    """Run the existing appointment agent + canned reply ladder."""
    transcript = state.get("transcript") or ""

    appointment_state, extracted = await process_appointment_message(
        transcript=transcript,
        conversation_id=str(state.get("conversation_id") or ""),
        user_id=state.get("user_id"),
        customer_name=state.get("user_name") or "",
        customer_email=state.get("user_email") or "",
    )

    answer = _format_appointment_reply(appointment_state, extracted)

    return {
        "response": answer,
        "reply_language": DEFAULT_LANGUAGE,
        "messages": _append_exchange(
            state.get("messages"), transcript, answer
        ),
    }


async def retrieve_rag(state: TurnState) -> dict:
    """Fetch business context from the vector store (existing RAG)."""
    transcript = state.get("transcript") or ""

    rag_context = await retrieve_business_context(
        question=transcript,
        business_id=RAG_DEFAULT_BUSINESS_ID,
    )

    return {"rag_context": rag_context}


async def build_context_node(state: TurnState) -> dict:
    """Assemble history + memory within the token budget."""
    if not MEMORY_ENABLED:
        return {"memory_context": "", "history": []}

    result = build_context(
        summary=state.get("summary") or "",
        facts=state.get("facts") or [],
        semantic_snippets=state.get("semantic_snippets") or [],
        messages=state.get("messages") or [],
        rag_context=state.get("rag_context") or "",
        budget_tokens=MEMORY_CONTEXT_TOKEN_BUDGET,
    )

    return {
        "memory_context": result["memory_context"],
        "history": result["history"],
    }


async def generate_node(state: TurnState) -> dict:
    """Call the LLM with history + memory + RAG context."""
    transcript = state.get("transcript") or ""

    # Same guard as before: RAG business must be configured.
    if not RAG_DEFAULT_BUSINESS_ID:
        answer = "The receptionist is not fully configured yet."
        return {
            "response": answer,
            "reply_language": DEFAULT_LANGUAGE,
            "messages": _append_exchange(
                state.get("messages"), transcript, answer
            ),
        }

    # Language instruction for non-English callers (the original
    # answer_question behaviour), applied only to this LLM call.
    language = state.get("language") or DEFAULT_LANGUAGE
    language_name = state.get("language_name") or ""

    if language != DEFAULT_LANGUAGE and language_name:
        prompted = (
            f"{transcript}\n\n"
            f"(Reply in {language_name}, in short spoken sentences, "
            f"without markdown or lists.)"
        )
    else:
        prompted = transcript

    memory_context = state.get("memory_context") or ""
    history = state.get("history") or []

    answer = await generate_response(
        prompted,
        business_id=RAG_DEFAULT_BUSINESS_ID,
        history=history or None,
        memory_context=memory_context or None,
    )

    return {
        "response": answer,
        "reply_language": language,
        "messages": _append_exchange(
            state.get("messages"), transcript, answer
        ),
    }


# ------------------------------------------------------------------
# Graph
# ------------------------------------------------------------------

_checkpointer = None
_checkpointer_initialized = False
_graph = None


def _get_checkpointer():
    """MongoDB checkpointer (lazily created, failure-tolerant)."""
    global _checkpointer, _checkpointer_initialized

    if _checkpointer_initialized:
        return _checkpointer

    _checkpointer_initialized = True

    try:
        from langgraph.checkpoint.mongodb import MongoDBSaver

        from config import MONGO_DB_NAME
        from database.mongodb import get_mongo_client

        client = get_mongo_client()
        if client is None:
            raise RuntimeError("MongoDB client unavailable")

        _checkpointer = MongoDBSaver(client, db_name=MONGO_DB_NAME)
        print(
            "LangGraph MongoDB checkpointer ready "
            f"(db={MONGO_DB_NAME})."
        )

    except Exception as error:
        _checkpointer = None
        print(
            "LangGraph checkpointer unavailable, continuing "
            f"without persisted graph state: {error!r}"
        )

    return _checkpointer


def _get_graph():
    """Compile the turn graph once (lazily)."""
    global _graph

    if _graph is not None:
        return _graph

    builder = StateGraph(TurnState)

    builder.add_node("load_memory", load_memory)
    builder.add_node("decide_route", decide_route)
    builder.add_node("appointment_node", appointment_node)
    builder.add_node("retrieve_rag", retrieve_rag)
    builder.add_node("build_context", build_context_node)
    builder.add_node("generate_node", generate_node)

    builder.add_edge(START, "load_memory")
    builder.add_edge("load_memory", "decide_route")

    builder.add_conditional_edges(
        "decide_route",
        lambda state: state.get("route") or "rag",
        {
            "appointment": "appointment_node",
            "rag": "retrieve_rag",
        },
    )

    builder.add_edge("retrieve_rag", "build_context")
    builder.add_edge("build_context", "generate_node")
    builder.add_edge("appointment_node", END)
    builder.add_edge("generate_node", END)

    _graph = builder.compile(checkpointer=_get_checkpointer())
    return _graph


# ------------------------------------------------------------------
# Public entry point
# ------------------------------------------------------------------

async def run_turn(
    *,
    user_id: Any,
    conversation_id: str,
    language: str,
    transcript: str,
    language_name: str = "",
    user_name: str = "",
    user_email: str = "",
) -> dict:
    """Run one full turn through the LangGraph orchestrator.

    Returns the final graph state; ``response`` and ``reply_language``
    are what the voice layer needs to send + speak. Raises on failure
    so the existing turn_worker fallback path is used.
    """
    graph = _get_graph()

    initial: TurnState = {
        "user_id": str(user_id),
        "conversation_id": str(conversation_id),
        "language": language or DEFAULT_LANGUAGE,
        "language_name": language_name or "",
        "transcript": transcript,
        "user_name": user_name or "",
        "user_email": user_email or "",
    }

    final_state = await graph.ainvoke(
        initial,
        config={
            "configurable": {
                "thread_id": str(conversation_id),
            }
        },
    )

    return final_state or {}
