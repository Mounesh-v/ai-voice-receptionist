from uuid import uuid4

from qdrant_client import QdrantClient, models

from config import (
    QDRANT_ENABLED,
    QDRANT_URL,
    QDRANT_API_KEY,
    QDRANT_COLLECTION_NAME,
)

EMBEDDING_DIMENSIONS = 768
COLLECTION_NAME = QDRANT_COLLECTION_NAME

client = None

if QDRANT_ENABLED:
    client = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
        timeout=30,
    )


def _require_qdrant() -> QdrantClient:
    if client is None:
        raise RuntimeError(
            "Qdrant is not configured. Set QDRANT_URL and QDRANT_API_KEY in the environment to enable vector search."
        )
    return client


def initialize_payload_indexes() -> None:
    if client is None:
        return

    client.create_payload_index(
        collection_name=COLLECTION_NAME,
        field_name="business_id",
        field_schema=models.PayloadSchemaType.KEYWORD,
        wait=True,
    )


def initialize_collection() -> None:
    if client is None:
        return

    try:
        collections = client.get_collections().collections

        if any(c.name == COLLECTION_NAME for c in collections):
            info = client.get_collection(COLLECTION_NAME)
            vectors = info.config.params.vectors

            if isinstance(vectors, dict):
                vector_config = vectors.get("")
            else:
                vector_config = vectors

            if (
                vector_config is None
                or vector_config.size != EMBEDDING_DIMENSIONS
            ):
                raise RuntimeError(
                    f"Collection '{COLLECTION_NAME}' has an incompatible "
                    f"vector configuration: {vectors!r}. "
                    f"Expected {EMBEDDING_DIMENSIONS} dimensions."
                )

            if vector_config.distance != models.Distance.COSINE:
                raise RuntimeError(
                    f"Collection '{COLLECTION_NAME}' must use Cosine distance."
                )

            print(f"Qdrant collection '{COLLECTION_NAME}' is ready.")
            return

        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=EMBEDDING_DIMENSIONS,
                distance=models.Distance.COSINE,
            ),
        )

        print(f"Created Qdrant collection '{COLLECTION_NAME}'.")
    except Exception as exc:
        print(f"Qdrant is unavailable; continuing without vector storage: {exc}")


try:
    initialize_collection()
    initialize_payload_indexes()
except Exception as exc:
    print(f"Qdrant initialization failed; continuing without vector store: {exc}")


def store_chunks(
    chunks: list[dict],
    embeddings: list[list[float]],
    business_id: str,
) -> int:
    if client is None:
        return 0

    if len(chunks) != len(embeddings):
        raise ValueError(
            "Each chunk must have exactly one embedding."
        )

    if not chunks:
        return 0

    points = []

    for chunk, embedding in zip(chunks, embeddings):
        if len(embedding) != EMBEDDING_DIMENSIONS:
            raise ValueError(
                f"Expected {EMBEDDING_DIMENSIONS}-dimensional embeddings."
            )

        payload = {
            "text": chunk["text"],
            "business_id": business_id,
            **chunk["metadata"],
        }

        points.append(
            models.PointStruct(
                id=str(uuid4()),
                vector=embedding,
                payload=payload,
            )
        )

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points,
        wait=True,
    )

    return len(points)


def search_chunks(
    query_embedding: list[float],
    business_id: str,
    limit: int = 5,
) -> list[dict]:
    if client is None:
        return []

    if len(query_embedding) != EMBEDDING_DIMENSIONS:
        raise ValueError(
            f"Expected {EMBEDDING_DIMENSIONS}-dimensional query embedding."
        )

    try:
        result = client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_embedding,
            query_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="business_id",
                        match=models.MatchValue(value=business_id),
                    )
                ]
            ),
            limit=limit,
            with_payload=True,
        )
    except Exception:
        return []

    return [
        {
            "text": point.payload.get("text", ""),
            "metadata": {
                key: value
                for key, value in point.payload.items()
                if key not in {"text", "business_id"}
            },
            "score": point.score,
        }
        for point in result.points
    ]
