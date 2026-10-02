import os
from dotenv import load_dotenv

load_dotenv()

# Deepgram (Voice Receptionist)
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")

# MongoDB Database Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "ai_voice_receptionist")

# Redis Session Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
SESSION_TTL = int(os.getenv("SESSION_TTL", "3600"))  # Expiration in seconds (default 1 hour)
SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "session_id")
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "False").lower() in ("true", "1", "yes")
SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "lax")