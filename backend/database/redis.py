import json
import logging
from typing import Optional, Dict, Any
import redis.asyncio as aioredis
from config import REDIS_URL, SESSION_TTL

logger = logging.getLogger(__name__)

# Redis Client Instance
_redis_client: Optional[aioredis.Redis] = None


async def get_redis_client() -> aioredis.Redis:
    """
    Get or initialize the async Redis client.
    Connects to REDIS_URL. If connection fails in development,
    falls back gracefully to an in-memory FakeRedis instance.
    """
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    try:
        client = aioredis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2.0,
            socket_timeout=2.0
        )
        # Verify connection
        await client.ping()
        logger.info(f"Connected to Redis server at {REDIS_URL}")
        _redis_client = client
        return _redis_client
    except Exception as exc:
        logger.warning(
            f"Could not connect to Redis server at {REDIS_URL} ({exc}). "
            "Falling back to in-memory FakeRedis for local development/testing."
        )
        import fakeredis.aioredis as fake_aio
        _redis_client = fake_aio.FakeRedis(decode_responses=True)
        return _redis_client


async def close_redis():
    """Close Redis client connection if open."""
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.close()
        except Exception as e:
            logger.warning(f"Error closing Redis connection: {e}")
        finally:
            _redis_client = None


def session_key(session_id: str) -> str:
    """Format Redis key for session storage."""
    return f"session:{session_id}"


async def create_session(
    session_id: str,
    user_id: str,
    role: str,
    email: str,
    name: str,
    ttl: int = SESSION_TTL
) -> bool:
    """
    Store session data in Redis with expiration TTL.
    Schema:
    session:<session_id> -> JSON { "user_id": ..., "role": ..., "email": ..., "name": ... }
    """
    client = await get_redis_client()
    data = {
        "user_id": user_id,
        "role": role,
        "email": email,
        "name": name,
    }
    key = session_key(session_id)
    await client.set(key, json.dumps(data), ex=ttl)
    return True


async def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve and parse session data from Redis.
    Returns None if session does not exist or has expired.
    """
    if not session_id:
        return None
    client = await get_redis_client()
    key = session_key(session_id)
    raw_data = await client.get(key)
    if not raw_data:
        return None
    try:
        return json.loads(raw_data)
    except Exception as e:
        logger.error(f"Failed to decode session data for {key}: {e}")
        return None


async def delete_session(session_id: str) -> bool:
    """
    Delete a session from Redis (session invalidation/logout).
    """
    if not session_id:
        return False
    client = await get_redis_client()
    key = session_key(session_id)
    deleted = await client.delete(key)
    return deleted > 0


async def get_session_ttl(session_id: str) -> int:
    """
    Get the remaining TTL for a session in seconds.
    Returns -2 if key does not exist, -1 if no TTL.
    """
    client = await get_redis_client()
    key = session_key(session_id)
    return await client.ttl(key)
