
import asyncio
import uuid

from services.appointment_agent import (
    process_appointment_message,
    delete_appointment_state,
)


async def main():

    conversation_id = str(uuid.uuid4())

    # Use a real authenticated user's ID from your database
    user_id = "6ac1c0c8b0eb42a4195bc3e1"

    try:

        # First patient message
        state, extracted = await process_appointment_message(
            transcript="I want an appointment with a cardiologist.",
            conversation_id=conversation_id,
            user_id=user_id,
            customer_name="Test User",
            customer_email="test@example.com"
        )

        print("\nFIRST MESSAGE")
        print(extracted.model_dump())
        print(state.model_dump())

        # Second patient message
        state, extracted = await process_appointment_message(
            transcript="Tomorrow at 10 AM.",
            conversation_id=conversation_id,
            user_id=user_id,
            customer_name="Test User",
            customer_email="test@example.com"
        )

        print("\nSECOND MESSAGE")
        print(extracted.model_dump())
        print(state.model_dump())

        # Third patient message
        state, extracted = await process_appointment_message(
            transcript="My reason is a regular heart checkup.",
            conversation_id=conversation_id,
            user_id=user_id,
            customer_name="Test User",
            customer_email="test@example.com"
        )

        print("\nTHIRD MESSAGE")
        print(extracted.model_dump())
        print(state.model_dump())

    finally:
        await delete_appointment_state(conversation_id)


if __name__ == "__main__":
    asyncio.run(main())
