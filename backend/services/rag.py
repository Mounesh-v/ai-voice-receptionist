import asyncio

from services.embeddings import generate_embeddings
from services.vector_store import search_chunks


async def retrieve_business_context(
    question: str,
    business_id: str,
    limit: int = 5,
) -> str:
    if not business_id.strip():
        raise ValueError("business_id is required.")

    # Run synchronous API and database calls off the event loop.
    query_vectors = await asyncio.to_thread(
        generate_embeddings,
        [question],
    )

    results = await asyncio.to_thread(
        search_chunks,
        query_vectors[0],
        business_id,
        limit,
    )

    if not results:
        return ""

    return "\n\n".join(
        (
            f"[Source: {item['metadata'].get('filename', 'unknown')}, "
            f"page {item['metadata'].get('page', '?')}]\n"
            f"{item['text']}"
        )
        for item in results
    )
