import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)
import asyncio

from services.chat import generate_response


from services.vector_store import client, COLLECTION_NAME

BUSINESS_ID = "demo-business-001"


async def main():
    business_id = "demo-business-001"

    questions = [
        "Can you tell me the hospital's opening hours?",
        "Can I book an appointment using the assistant?",
    ]

    for question in questions:
        answer = await generate_response(
            transcript=question,
            business_id=business_id,
        )

        print(f"\nQuestion: {question}")
        print(f"Answer: {answer}")


if __name__ == "__main__":
    asyncio.run(main())