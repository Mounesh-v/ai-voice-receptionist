import os
from dotenv import load_dotenv

load_dotenv()

RAG_DEFAULT_BUSINESS_ID = os.getenv(
    "RAG_DEFAULT_BUSINESS_ID",
    "",
).strip()

# Deepgram (Voice Receptionist)
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")

# Groq (LLM)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# MongoDB Database Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "ai_voice_receptionist")

# Redis Session Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
SESSION_TTL = int(os.getenv("SESSION_TTL", "3600"))  # Expiration in seconds (default 1 hour)
SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "session_id")
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "False").lower() in ("true", "1", "yes")
SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "lax")

#Gemini (Embbeddings)
GEMINI_API_KEY= os.getenv("GEMINI_API_KEY","")


QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION_NAME = os.getenv(
    "QDRANT_COLLECTION_NAME",
    "business_documents",
)

if not QDRANT_URL:
    raise RuntimeError("QDRANT_URL is missing from .env")

if not QDRANT_API_KEY:
    raise RuntimeError("QDRANT_API_KEY is missing from .env")