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


def get_mongo_client() -> MongoClient:
    """Returns the MongoClient instance."""
    return client


def get_db():
    """Returns the database instance."""
    return db


def get_users_collection():
    """Returns the users collection."""
    return users_collection
