"""Background memory updates after a completed turn.

Scheduled by the voice layer once the assistant reply has been
persisted. Never blocks or fails a live turn: every step is wrapped
in try/except and runs in its own task.

Responsibilities:
1. Index the exchange for optional semantic retrieval (Qdrant).
2. Fold older messages into the user's rolling summary when the
   post-cutoff message volume exceeds the token threshold.
3. Extract stable long-term facts with the LLM (every N turns).
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime, timezone

from langchain_groq import ChatGroq

from config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    MEMORY_FACT_EXTRACT_EVERY,
    MEMORY_ENABLED,
    MEMORY_RECENT_MESSAGES,
    MEMORY_SUMMARY_TRIGGER_TOKENS,
)
from services.conversation_memory import get_conversation_history
from services.memory import semantic as semantic_memory
from services.memory.stores import (
    add_user_facts,
    get_user_summary_doc,
    save_user_summary,
)
from services.memory.tokens import (
    estimate_message_tokens,
    estimate_tokens,
)

logger = logging.getLogger(__name__)

# Strong references so tasks are not garbage-collected mid-flight.
_background_tasks: set[asyncio.Task] = set()

_llm = ChatGroq(
    model=GROQ_MODEL,
    api_key=GROQ_API_KEY,
    temperature=0.0,
    max_retries=1,
)

_SUMMARY_SYSTEM = (
    "You maintain a rolling summary of a caller's conversations with "
    "an AI receptionist. Merge the previous summary with the new "
    "exchanges into one concise paragraph (max 120 words) in English. "
    "Keep stable facts: names, preferences, requests, appointments "
    "discussed, and anything the caller emphasized. Drop pleasantries "
    "and repetition. Return ONLY the summary text, no preamble."
)

_FACTS_SYSTEM = (
    "Extract stable facts about this caller from the exchange below. "
    "A stable fact is a durable preference, identity detail, or "
    "recurring need (e.g. 'Prefers Hindi for replies', "
    "'Interested in cardiology appointments'). Do NOT extract "
    "transient details (greetings, one-off questions). "
    'Return ONLY a JSON array of short strings, e.g. '
    '["fact one", "fact two"]. Return [] if there are no stable facts.'
)


def schedule_memory_update(
    user_id: str,
    conversation_id: str,
    user_text: str,
    ai_text: str,
) -> None:
    """Fire-and-forget background memory update for one turn."""
    if not MEMORY_ENABLED:
        return

    task = asyncio.create_task(
        _run_memory_update(
            str(user_id),
            str(conversation_id),
            user_text,
            ai_text,
        )
    )
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


async def _run_memory_update(
    user_id: str,
    conversation_id: str,
    user_text: str,
    ai_text: str,
) -> None:
    try:
        # 1) Semantic indexing of this exchange (optional).
        if semantic_memory.semantic_enabled():
            await asyncio.to_thread(
                semantic_memory.store_exchange,
                user_id,
                conversation_id,
                user_text,
                ai_text,
            )

        # Fetch history once; used by both summary and fact steps.
        rows = await asyncio.to_thread(
            _load_history,
            conversation_id,
            user_id,
        )

        # 2) Rolling summary when the post-cutoff volume is large.
        await _maybe_update_summary(user_id, rows)

        # 3) Long-term fact extraction every N turns.
        await _maybe_extract_facts(user_id, conversation_id, rows)

    except Exception as error:
        logger.warning("background memory update failed: %r", error)


def _load_history(
    conversation_id: str,
    user_id: str,
) -> list[dict]:
    """Conversation messages as [{"role", "content", "timestamp"}]."""
    try:
        rows = get_conversation_history(
            conversation_id,
            user_id,
            limit=500,
        )
    except Exception as error:
        logger.warning("history load failed: %r", error)
        return []

    messages: list[dict] = []
    for row in rows:
        role = row.get("role")
        content = row.get("content")
        if role in ("user", "assistant") and content:
            messages.append({
                "role": role,
                "content": content,
                "timestamp": row.get("timestamp"),
            })
    return messages


async def _maybe_update_summary(
    user_id: str,
    messages: list[dict],
) -> None:
    """Fold older post-cutoff messages into the rolling summary."""
    doc = get_user_summary_doc(user_id)
    cutoff = doc.get("cutoff_at")
    prior_summary = str(doc.get("summary") or "").strip()

    post_cutoff = [
        m for m in messages
        if cutoff is None or _is_after(m.get("timestamp"), cutoff)
    ]

    if not post_cutoff:
        return

    # Keep the newest window verbatim; only older messages are folded.
    if len(post_cutoff) <= MEMORY_RECENT_MESSAGES:
        return

    older = post_cutoff[:-MEMORY_RECENT_MESSAGES]

    total_tokens = sum(
        estimate_message_tokens(m) for m in post_cutoff
    )
    if total_tokens < MEMORY_SUMMARY_TRIGGER_TOKENS:
        return

    transcript_lines = []
    for message in older:
        who = "Caller" if message["role"] == "user" else "Receptionist"
        transcript_lines.append(f"{who}: {message['content']}")

    new_input = "\n".join(transcript_lines)

    user_prompt = ""
    if prior_summary:
        user_prompt = (
            f"Previous summary:\n{prior_summary}\n\n"
            f"New exchanges to merge in:\n{new_input}"
        )
    else:
        user_prompt = f"Exchanges to summarize:\n{new_input}"

    result = await _llm.ainvoke([
        ("system", _SUMMARY_SYSTEM),
        ("human", user_prompt),
    ])

    new_summary = str(result.content or "").strip()
    if not new_summary:
        return

    cutoff_at = _extract_cutoff(older)
    save_user_summary(user_id, new_summary, cutoff_at=cutoff_at)

    logger.info(
        "Rolling summary updated for user %s (%d messages folded)",
        user_id,
        len(older),
    )


async def _maybe_extract_facts(
    user_id: str,
    conversation_id: str,
    messages: list[dict],
) -> None:
    """Extract stable facts every MEMORY_FACT_EXTRACT_EVERY turns."""
    if MEMORY_FACT_EXTRACT_EVERY <= 0:
        return

    user_turns = sum(1 for m in messages if m["role"] == "user")
    if user_turns == 0 or user_turns % MEMORY_FACT_EXTRACT_EVERY != 0:
        return

    # Only the latest exchange matters for stable facts.
    latest = messages[-2:] if len(messages) >= 2 else messages
    if not latest:
        return

    transcript_lines = []
    for message in latest:
        who = "Caller" if message["role"] == "user" else "Receptionist"
        transcript_lines.append(f"{who}: {message['content']}")

    result = await _llm.ainvoke([
        ("system", _FACTS_SYSTEM),
        ("human", "\n".join(transcript_lines)),
    ])

    facts = _parse_facts(str(result.content or ""))
    if not facts:
        return

    await asyncio.to_thread(
        add_user_facts,
        user_id,
        facts,
        source=conversation_id,
    )

    logger.info(
        "Extracted %d fact(s) for user %s", len(facts), user_id
    )


# ------------------------------------------------------------------
# Small utilities
# ------------------------------------------------------------------

def _is_after(value, cutoff) -> bool:
    """True when ``value`` (datetime or None) is newer than cutoff."""
    if value is None:
        return True
    try:
        if isinstance(value, str):
            value = datetime.fromisoformat(value)
        if isinstance(cutoff, str):
            cutoff = datetime.fromisoformat(cutoff)
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        if cutoff.tzinfo is None:
            cutoff = cutoff.replace(tzinfo=timezone.utc)
        return value > cutoff
    except Exception:
        return True


def _extract_cutoff(messages: list[dict]):
    """Newest timestamp among the folded messages (or now)."""
    newest = None
    for message in messages:
        ts = message.get("timestamp")
        if ts is None:
            continue
        if newest is None or _is_after(ts, newest):
            newest = ts
    if newest is None:
        return datetime.now(timezone.utc)
    if isinstance(newest, str):
        try:
            newest = datetime.fromisoformat(newest)
        except Exception:
            return datetime.now(timezone.utc)
    if newest.tzinfo is None:
        newest = newest.replace(tzinfo=timezone.utc)
    return newest


def _parse_facts(raw: str) -> list[str]:
    """Parse an LLM JSON array response into a list of strings."""
    text = raw.strip()

    # Strip ```json fences if present.
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    # Fall back to the first [...] slice when the model rambles.
    if not text.startswith("["):
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if match:
            text = match.group(0)

    try:
        data = json.loads(text)
    except Exception:
        return []

    if not isinstance(data, list):
        return []

    facts: list[str] = []
    for item in data:
        fact = str(item).strip()
        if fact:
            facts.append(fact)
    return facts[:20]
