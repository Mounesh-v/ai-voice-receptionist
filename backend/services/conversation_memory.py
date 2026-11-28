
import logging
import uuid
from datetime import datetime, timezone

from pymongo.errors import PyMongoError
from database.mongodb import (
    get_conversations_collection,
    get_messages_collection,
)

logger = logging.getLogger(__name__)


def utc_now():
    return datetime.now(timezone.utc)


def start_conversation(user_id: str) -> str:
    """Create a new conversation for an authenticated user."""

    conversation_id = str(uuid.uuid4())

    conversations = get_conversations_collection()

    if conversations is None:
        raise RuntimeError("MongoDB conversations collection unavailable")

    conversations.insert_one({
        "_id": conversation_id,
        "user_id": str(user_id),
        "status": "active",
        "started_at": utc_now(),
        "ended_at": None,
    })

    logger.info("Conversation started: %s", conversation_id)

    return conversation_id


def save_message(
    conversation_id: str,
    user_id: str,
    role: str,
    content: str,
):
    """Save an individual user or assistant message."""

    if role not in ("user", "assistant"):
        raise ValueError("Invalid message role")

    if not content or not content.strip():
        return

    conversations = get_conversations_collection()
    messages = get_messages_collection()

    if conversations is None or messages is None:
        raise RuntimeError("MongoDB conversation collections unavailable")

    # Verify ownership and active conversation
    conversation = conversations.find_one({
        "_id": conversation_id,
        "user_id": str(user_id),
        "status": "active",
    })

    if not conversation:
        raise ValueError("Conversation not found or access denied")

    messages.insert_one({
        "conversation_id": conversation_id,
        "user_id": str(user_id),
        "role": role,
        "content": content.strip(),
        "timestamp": utc_now(),
    })


def end_conversation(conversation_id: str, user_id: str):
    """Mark a conversation as completed."""

    conversations = get_conversations_collection()

    if conversations is None:
        raise RuntimeError("MongoDB conversations collection unavailable")

    result = conversations.update_one(
        {
            "_id": conversation_id,
            "user_id": str(user_id),
            "status": "active",
        },
        {
            "$set": {
                "status": "completed",
                "ended_at": utc_now(),
            }
        },
    )

    if result.modified_count:
        logger.info("Conversation ended: %s", conversation_id)


def get_conversation_history(
    conversation_id: str,
    user_id: str,
    limit: int = 100,
):
    """Retrieve messages belonging to an authenticated user's conversation."""

    conversations = get_conversations_collection()
    messages = get_messages_collection()

    if conversations is None or messages is None:
        raise RuntimeError("MongoDB conversation collections unavailable")

    conversation = conversations.find_one({
        "_id": conversation_id,
        "user_id": str(user_id),
    })

    if not conversation:
        raise ValueError("Conversation not found or access denied")

    return list(
        messages.find({
            "conversation_id": conversation_id,
            "user_id": str(user_id),
        })
        .sort("timestamp", 1)
        .limit(max(1, min(limit, 500)))
    )
