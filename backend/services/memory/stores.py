"""MongoDB stores for rolling summaries and long-term user facts.

All functions here are synchronous (pymongo) and are called from async
code via ``asyncio.to_thread`` / ``run_in_threadpool``. Every function
degrades gracefully: if MongoDB is unavailable the callers receive
empty values instead of raising, so a memory failure never breaks a
live voice turn.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from config import MEMORY_MAX_FACTS
from database.mongodb import (
    get_user_facts_collection,
    get_user_summaries_collection,
)

logger = logging.getLogger(__name__)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ------------------------------------------------------------------
# Rolling conversation summary (per user, cross-session)
# ------------------------------------------------------------------

def get_user_summary(user_id: str) -> str:
    """Return the user's rolling conversation summary, or ""."""
    try:
        doc = get_user_summary_doc(user_id)
        return str(doc.get("summary") or "").strip()
    except Exception as error:
        logger.warning("get_user_summary failed: %r", error)
        return ""


def get_user_summary_doc(user_id: str) -> dict:
    """Return the full summary document (summary + cutoff_at), or {}."""
    try:
        collection = get_user_summaries_collection()
        if collection is None:
            return {}

        doc = collection.find_one({"_id": str(user_id)})
        return doc or {}

    except Exception as error:
        logger.warning("get_user_summary_doc failed: %r", error)
        return {}


def save_user_summary(
    user_id: str,
    summary: str,
    cutoff_at: datetime | None = None,
) -> None:
    """Create or replace the user's rolling summary.

    ``cutoff_at`` marks the timestamp of the newest message already
    folded into the summary so later runs only process new messages.
    """
    text = (summary or "").strip()
    if not text:
        return

    collection = get_user_summaries_collection()
    if collection is None:
        raise RuntimeError("user summaries collection unavailable")

    update: dict = {
        "user_id": str(user_id),
        "summary": text,
        "updated_at": _utc_now(),
    }
    if cutoff_at is not None:
        update["cutoff_at"] = cutoff_at

    collection.update_one(
        {"_id": str(user_id)},
        {
            "$set": update,
            "$setOnInsert": {
                "created_at": _utc_now(),
            },
        },
        upsert=True,
    )


# ------------------------------------------------------------------
# Long-term user facts (per user, cross-session)
# ------------------------------------------------------------------

def get_user_facts(user_id: str) -> list[str]:
    """Return the user's long-term facts, newest useful order."""
    try:
        collection = get_user_facts_collection()
        if collection is None:
            return []

        doc = collection.find_one({"_id": str(user_id)})
        if not doc:
            return []

        facts = doc.get("facts") or []
        return [f for f in facts if isinstance(f, str) and f.strip()]

    except Exception as error:
        logger.warning("get_user_facts failed: %r", error)
        return []


def add_user_facts(
    user_id: str,
    facts: list[str],
    source: str = "",
) -> list[str]:
    """Merge new facts into the user's fact list (deduplicated).

    Existing facts are preserved; new ones are appended until
    MEMORY_MAX_FACTS is reached (oldest dropped first). Returns the
    resulting fact list.
    """
    cleaned: list[str] = []
    for fact in facts or []:
        text = str(fact).strip()
        if text:
            cleaned.append(text)

    if not cleaned:
        return get_user_facts(user_id)

    collection = get_user_facts_collection()
    if collection is None:
        raise RuntimeError("user facts collection unavailable")

    doc = collection.find_one({"_id": str(user_id)}) or {}
    existing: list[str] = [
        f for f in (doc.get("facts") or [])
        if isinstance(f, str) and f.strip()
    ]

    seen = {f.casefold() for f in existing}
    for fact in cleaned:
        key = fact.casefold()
        if key in seen:
            continue
        seen.add(key)
        existing.append(fact)

    # Cap the list, dropping the oldest facts first.
    if len(existing) > MEMORY_MAX_FACTS:
        existing = existing[-MEMORY_MAX_FACTS:]

    collection.update_one(
        {"_id": str(user_id)},
        {
            "$set": {
                "user_id": str(user_id),
                "facts": existing,
                "updated_at": _utc_now(),
                "last_source": str(source or ""),
            },
            "$setOnInsert": {
                "created_at": _utc_now(),
            },
        },
        upsert=True,
    )

    return existing
