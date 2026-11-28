"""LangGraph orchestrator end-to-end test (real Groq + Mongo + graph).

Run:  python Test/test_orchestrator.py
"""

import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

import asyncio
import uuid

from config import MONGO_DB_NAME, MEMORY_RECENT_MESSAGES
from database.mongodb import get_mongo_client
from services.memory.stores import add_user_facts, get_user_facts
from services.orchestrator import (
    _get_graph,
    is_appointment_request,
    run_turn,
)


def _fresh_ids():
    user_id = f"test-orch-{uuid.uuid4()}"
    conversation_id = str(uuid.uuid4())
    return user_id, conversation_id


async def test_rag_route():
    user_id, conversation_id = _fresh_ids()

    state = await run_turn(
        user_id=user_id,
        conversation_id=conversation_id,
        language="en-IN",
        language_name="English",
        transcript="What are your hospital's OPD timings?",
        user_name="Test",
        user_email="test@example.com",
    )

    assert state.get("route") == "rag", state.get("route")
    assert state.get("response"), "empty RAG response"
    assert state.get("reply_language") == "en-IN"
    print(f"RAG route OK -> {state['response'][:100]!r}")
    return user_id, conversation_id


async def test_appointment_route():
    user_id, conversation_id = _fresh_ids()

    try:
        state = await run_turn(
            user_id=user_id,
            conversation_id=conversation_id,
            language="en-IN",
            language_name="English",
            transcript="I want to book an appointment",
            user_name="Test",
            user_email="test@example.com",
        )

        assert state.get("route") == "appointment", state.get("route")
        answer = state.get("response") or ""
        assert "department" in answer.lower(), answer
        assert state.get("reply_language") == "en-IN"
        print(f"appointment route OK -> {answer[:80]!r}")
    finally:
        from services.appointment_agent import delete_appointment_state

        await delete_appointment_state(conversation_id)


async def test_within_conversation_recall():
    """Turn 2 must see turn 1 through the checkpointer state."""
    user_id, conversation_id = _fresh_ids()

    state1 = await run_turn(
        user_id=user_id,
        conversation_id=conversation_id,
        language="en-IN",
        language_name="English",
        transcript=(
            "Hi, my name is Zorblatt and I am allergic to penicillin. "
            "Please always remember that."
        ),
    )
    assert state1.get("route") == "rag"

    state2 = await run_turn(
        user_id=user_id,
        conversation_id=conversation_id,
        language="en-IN",
        language_name="English",
        transcript="What is my name and what am I allergic to?",
    )

    answer2 = (state2.get("response") or "").lower()
    assert "zorblatt" in answer2, (
        f"conversation recall failed: {answer2!r}"
    )
    assert "penicillin" in answer2, (
        f"allergy recall failed: {answer2!r}"
    )
    print(f"within-conversation recall OK -> {state2['response'][:120]!r}")

    # The graph state must carry the exchange for the next turn.
    graph = _get_graph()
    snapshot = await graph.aget_state(
        {"configurable": {"thread_id": conversation_id}}
    )
    messages = snapshot.values.get("messages") or []
    roles = [m.get("role") for m in messages]
    assert "user" in roles and "assistant" in roles, roles
    assert len(messages) <= MEMORY_RECENT_MESSAGES + 2
    print(f"checkpointer state OK ({len(messages)} messages persisted)")


async def test_cross_session_facts():
    """Facts seeded for a user load in a brand-new conversation."""
    user_id, conversation_id = _fresh_ids()

    # Seed a long-term fact directly (as the background updater would).
    add_user_facts(
        user_id,
        ["Caller's name is Maximus and he prefers Hindi replies"],
        source="prior-conversation",
    )
    assert get_user_facts(user_id)

    state = await run_turn(
        user_id=user_id,
        conversation_id=conversation_id,  # brand-new conversation
        language="hi-IN",
        language_name="Hindi",
        transcript="Do you know who I am and which language I prefer?",
    )

    answer = (state.get("response") or "").lower()
    # The reply may come back in Hindi (Devanagari transliteration),
    # so accept either script.
    assert (
        "maximus" in answer or "मैक्सिमस" in state.get("response", "")
    ), f"cross-session name recall failed: {answer!r}"
    # Facts were loaded into the graph state too.
    facts = state.get("facts") or []
    assert any("maximus" in f.lower() for f in facts), facts
    print(f"cross-session facts OK -> {state['response'][:120]!r}")


async def test_checkpointer_persists_in_mongo():
    """A checkpoint row must exist for the conversation thread."""
    user_id, conversation_id = _fresh_ids()

    await run_turn(
        user_id=user_id,
        conversation_id=conversation_id,
        language="en-IN",
        language_name="English",
        transcript="Hello there, are you open on Sundays?",
    )

    client = get_mongo_client()
    assert client is not None, "MongoDB client missing"

    db = client[MONGO_DB_NAME]
    doc = db["checkpoints"].find_one({"thread_id": conversation_id})
    assert doc is not None, "no checkpoint row written for thread"
    print("MongoDB checkpointer persistence OK")


def test_routing_helpers():
    assert is_appointment_request("I want to book an appointment")
    assert is_appointment_request("Please cancel my appointment")
    assert is_appointment_request("I need to reschedule my booking")
    assert not is_appointment_request("What are your visiting hours?")
    print("routing helpers OK")


async def main():
    test_routing_helpers()
    await test_rag_route()
    await test_appointment_route()
    await test_within_conversation_recall()
    await test_cross_session_facts()
    await test_checkpointer_persists_in_mongo()
    print("ALL OK")


if __name__ == "__main__":
    asyncio.run(main())
