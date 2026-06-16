"""
PersonaForge — Redis Client (hard dependency)
================================================
Redis is required for caching, rate limiting, and BullMQ queues.
This module fails fast if Redis is unreachable.
"""

from typing import Optional

import redis.asyncio as redis

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_redis: Optional[redis.Redis] = None


async def init_redis() -> redis.Redis:
    """Initialize Redis connection. Called at startup."""
    global _redis
    if _redis is not None:
        return _redis
    logger.info("init_redis", url=settings.redis_url)
    try:
        _redis = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=50,
            retry_on_timeout=True,
            socket_keepalive=True,
            health_check_interval=30,
        )
        # Verify connectivity
        await _redis.ping()
        logger.info("redis_connection_ok")
        return _redis
    except Exception as e:
        logger.error("redis_connection_failed", error=str(e))
        raise RuntimeError(
            f"Cannot connect to Redis at {settings.redis_url}. "
            f"Redis is a hard dependency in production. Error: {e}"
        ) from e


async def get_redis() -> redis.Redis:
    """FastAPI dependency that returns the Redis client."""
    if _redis is None:
        await init_redis()
    assert _redis is not None
    return _redis


async def close_redis() -> None:
    """Called at shutdown."""
    global _redis
    if _redis is not None:
        await _redis.close()
        _redis = None
        logger.info("redis_connection_closed")
