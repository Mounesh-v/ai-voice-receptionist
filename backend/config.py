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


QDRANT_URL = os.getenv("QDRANT_URL", "").strip()
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "").strip()
QDRANT_COLLECTION_NAME = os.getenv(
    "QDRANT_COLLECTION_NAME",
    os.getenv("QDRANT_COLLECTION", "business_documents"),
).strip()

QDRANT_ENABLED = bool(QDRANT_URL and QDRANT_API_KEY)


SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_STT_MODEL = os.getenv("SARVAM_STT_MODEL", "saaras:v4")
SARVAM_TTS_MODEL = os.getenv("SARVAM_TTS_MODEL", "bulbul:v3")
SARVAM_TTS_SPEAKER = os.getenv("SARVAM_TTS_SPEAKER", "shubh")


def _env_flag(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("true", "1", "yes", "on")


# ---------------------------------------------------------------
# Conversational memory (LangGraph orchestrator)
# ---------------------------------------------------------------

# Master switch. When false the graph still runs but memory nodes
# return empty values and no background memory updates are scheduled.
MEMORY_ENABLED = _env_flag("MEMORY_ENABLED", True)

# Maximum tokens for the assembled context (history + memory block +
# RAG context) sent to the LLM on a single turn.
MEMORY_CONTEXT_TOKEN_BUDGET = int(
    os.getenv("MEMORY_CONTEXT_TOKEN_BUDGET", "3000")
)

# When the user's message history exceeds this many tokens, the older
# part is folded into the rolling summary.
MEMORY_SUMMARY_TRIGGER_TOKENS = int(
    os.getenv("MEMORY_SUMMARY_TRIGGER_TOKENS", "1800")
)

# Maximum number of recent messages kept verbatim in the context.
MEMORY_RECENT_MESSAGES = int(
    os.getenv("MEMORY_RECENT_MESSAGES", "10")
)

# Maximum number of long-term facts kept per user.
MEMORY_MAX_FACTS = int(
    os.getenv("MEMORY_MAX_FACTS", "25")
)

# Run fact extraction every N turns (1 = every turn).
MEMORY_FACT_EXTRACT_EVERY = int(
    os.getenv("MEMORY_FACT_EXTRACT_EVERY", "1")
)

# Semantic retrieval of past conversations from Qdrant. Defaults to
# on whenever Qdrant itself is configured.
MEMORY_SEMANTIC_ENABLED = _env_flag(
    "MEMORY_SEMANTIC_ENABLED",
    QDRANT_ENABLED,
)

# Number of past-conversation snippets returned by semantic search.
MEMORY_SEMANTIC_TOP_K = int(
    os.getenv("MEMORY_SEMANTIC_TOP_K", "3")
)

# Separate Qdrant collection for conversational memory (never mixed
# with the business document index).
QDRANT_MEMORY_COLLECTION_NAME = os.getenv(
    "QDRANT_MEMORY_COLLECTION_NAME",
    "conversation_memories",
).strip()