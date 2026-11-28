"""Semantic retrieval of past conversations from Qdrant.

Optional component of the memory layer: exchanges from earlier turns
are embedded (Gemini, 768-dim) and stored in a dedicated Qdrant
collection (``conversation_memories`` by default) that is completely
separate from the business document index. At turn start the current
transcript is embedded and matched against this caller's own history
only (filtered by ``user_id``).

Every public function is failure-tolerant: if Qdrant, Gemini, or the
network is unavailable, callers get an empty list instead of an error,
so semantic retrieval can never break a live voice turn.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from config import (
    MEMORY_SEMANTIC_ENABLED,
    MEMORY_SEMANTIC_TOP_K,
    QDRANT_ENABLED,
    QDRANT_MEMORY_COLLECTION_NAME,
)
from services.embeddings import EMBEDDING_DIMENSIONS, generate_embeddings
from services.vector_store import client as qdrant_client

logger = logging.getLogger(__name__)

# Minimum similarity score for a past-conversation snippet to count.
SCORE_THRESHOLD = 0.25

_collection_ready = False


def semantic_enabled() -> bool:
    """True when semantic retrieval can actually run."""
    return (
        MEMORY_SEMANTIC_ENABLED
        and QDRANT_ENABLED
        and qdrant_client is not None
    )


def _ensure_collection() -> bool:
    """Create the memory collection on first use (idempotent)."""
    global _collection_ready

    if _collection_ready:
        return True

    if qdrant_client is None:
        return False

    from qdrant_client import models

    name = QDRANT_MEMORY_COLLECTION_NAME

    try:
        collections = qdrant_client.get_collections().collections
        if not any(c.name == name for c in collections):
            qdrant_client.create_collection(
                collection_name=name,
                vectors_config=models.VectorParams(
                    size=EMBEDDING_DIMENSIONS,
                    distance=models.Distance.COSINE,
                ),
            )
            print(f"Created Qdrant collection '{name}'.")

        qdrant_client.create_payload_index(
            collection_name=name,
            field_name="user_id",
            field_schema=models.PayloadSchemaType.KEYWORD,
            wait=True,
        )

        _collection_ready = True
        return True

    except Exception as error:
        logger.warning("Memory collection init failed: %r", error)
        return False


def store_exchange(
    user_id: str,
    conversation_id: str,
    user_text: str,
    ai_text: str,
) -> bool:
    """Index one user/assistant exchange for this user (sync).

    Returns True when the exchange was stored.
    """
    if not semantic_enabled():
        return False

    combined = (
        f"Caller said: {user_text.strip()}\n"
        f"Receptionist replied: {ai_text.strip()}"
    ).strip()

    if not combined:
        return False

    try:
        if not _ensure_collection():
            return False

        from qdrant_client import models
        from uuid import uuid4

        vector = generate_embeddings([combined])[0]

        qdrant_client.upsert(
            collection_name=QDRANT_MEMORY_COLLECTION_NAME,
            points=[
                models.PointStruct(
                    id=str(uuid4()),
                    vector=vector,
                    payload={
                        "text": combined,
                        "user_id": str(user_id),
                        "conversation_id": str(conversation_id),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )
            ],
            wait=True,
        )
        return True

    except Exception as error:
        logger.warning("store_exchange failed: %r", error)
        return False


def search_relevant(
    user_id: str,
    query: str,
    limit: int | None = None,
) -> list[str]:
    """Return past-conversation snippets relevant to ``query`` (sync).

    Only searches this user's own exchanges. Failure -> [].
    """
    if not semantic_enabled() or not query.strip():
        return []

    try:
        if not _ensure_collection():
            return []

        from qdrant_client import models

        top_k = limit or MEMORY_SEMANTIC_TOP_K
        vector = generate_embeddings([query])[0]

        result = qdrant_client.query_points(
            collection_name=QDRANT_MEMORY_COLLECTION_NAME,
            query=vector,
            query_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="user_id",
                        match=models.MatchValue(value=str(user_id)),
                    )
                ]
            ),
            limit=max(1, top_k),
            with_payload=True,
        )

        snippets: list[str] = []
        for point in result.points:
            if point.score is not None and point.score < SCORE_THRESHOLD:
                continue
            text = (point.payload or {}).get("text", "")
            if text:
                snippets.append(text)

        return snippets

    except Exception as error:
        logger.warning("search_relevant failed: %r", error)
        return []
