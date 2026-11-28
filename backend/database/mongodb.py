import logging
from pymongo import MongoClient, ASCENDING
from pymongo.errors import PyMongoError
from config import MONGO_URI, MONGO_DB_NAME

logger = logging.getLogger(__name__)

# Initialize MongoDB client
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client[MONGO_DB_NAME]
    users_collection = db["users"]
    conversations_collection = db["conversations"]
    messages_collection = db["conversation_messages"]

    # Conversational memory collections (LangGraph memory layer).
    # Kept separate from users/appointments/patient data.
    user_summaries_collection = db["user_conversation_summaries"]
    user_facts_collection = db["user_memory_facts"]

    # Conversation memory indexes
    conversations_collection.create_index(
        [("user_id", ASCENDING)]
    )

    messages_collection.create_index(
        [
            ("conversation_id", ASCENDING),
            ("timestamp", ASCENDING)
        ]
    )

    messages_collection.create_index(
        [("user_id", ASCENDING)]
    )

    # One rolling summary and one fact list per user (cross-session).
    user_summaries_collection.create_index(
        [("user_id", ASCENDING)], unique=True
    )
    user_facts_collection.create_index(
        [("user_id", ASCENDING)], unique=True
    )
    
    # Ensure unique index on email to guarantee uniqueness at database level
    try:
        users_collection.create_index([("email", ASCENDING)], unique=True)
    except Exception as idx_err:
        logger.warning(f"Could not create unique index on email: {idx_err}")

except Exception as err:
    logger.error(f"Failed to initialize MongoDB connection: {err}")
    client = None
    db = None
    users_collection = None
    conversations_collection = None
    messages_collection = None
    user_summaries_collection = None
    user_facts_collection = None


def get_mongo_client() -> MongoClient:
    """Returns the MongoClient instance."""
    return client


def get_db():
    """Returns the database instance."""
    return db


def get_users_collection():
    """Returns the users collection."""
    return users_collection


def get_conversations_collection():
    return conversations_collection


def get_messages_collection():
    return messages_collection


def get_user_summaries_collection():
    """Rolling conversation summaries per user (LangGraph memory)."""
    return user_summaries_collection


def get_user_facts_collection():
    """Long-term user facts per user (LangGraph memory)."""
    return user_facts_collection