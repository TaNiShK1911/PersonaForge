"""
PersonaForge — Event Pipeline (Celery + Redis)
================================================
Distributed task queue. Workers consume from Redis-backed Celery queue.
"""

from typing import List

from app.core.logging import get_logger
from app.database.redis import get_redis

logger = get_logger(__name__)

# In production, these would be Celery tasks. For the reference implementation
# we expose async functions that workers call.

EVENT_QUEUE_KEY = "personaforge:events:queue"
PROCESSED_COUNTER_KEY = "personaforge:events:processed"


async def enqueue_event(event: dict) -> str:
    """Push an event onto the Redis queue for async processing."""
    import json
    redis = await get_redis()
    await redis.rpush(EVENT_QUEUE_KEY, json.dumps(event))
    logger.info("event_enqueued", user_id=event.get("user_id"), type=event.get("type"))
    return "ok"


async def enqueue_batch(events: List[dict]) -> int:
    """Push a batch of events."""
    import json
    redis = await get_redis()
    pipeline = redis.pipeline()
    for e in events:
        pipeline.rpush(EVENT_QUEUE_KEY, json.dumps(e))
    await pipeline.execute()
    logger.info("batch_enqueued", count=len(events))
    return len(events)


async def process_one() -> bool:
    """Pop and process one event. Returns True if an event was processed."""
    import json
    from sqlalchemy import text
    from app.database.session import SessionLocal

    redis = await get_redis()
    raw = await redis.lpop(EVENT_QUEUE_KEY)
    if not raw:
        return False
    event = json.loads(raw)
    # Persist to DB
    async with SessionLocal() as session:
        await session.execute(
            text(
                "INSERT INTO events (id, user_id, type, timestamp, page_depth, "
                "product_id, query, scroll_pct, dwell_sec, price, "
                "discount_seen, social_proof_seen, review_seen, urgency_seen) "
                "VALUES (gen_random_uuid(), :user_id, :type, :timestamp, :page_depth, "
                ":product_id, :query, :scroll_pct, :dwell_sec, :price, "
                ":discount_seen, :social_proof_seen, :review_seen, :urgency_seen)"
            ),
            {
                "user_id": event.get("user_id"),
                "type": event.get("type"),
                "timestamp": event.get("timestamp", 0),
                "page_depth": event.get("page_depth", 0),
                "product_id": event.get("product_id"),
                "query": event.get("query"),
                "scroll_pct": event.get("scroll_pct"),
                "dwell_sec": event.get("dwell_sec"),
                "price": event.get("price"),
                "discount_seen": event.get("discount_seen", False),
                "social_proof_seen": event.get("social_proof_seen", False),
                "review_seen": event.get("review_seen", False),
                "urgency_seen": event.get("urgency_seen", False),
            },
        )
        await session.commit()
    await redis.incr(PROCESSED_COUNTER_KEY)
    return True


async def process_batch(max_n: int = 100) -> int:
    """Process up to max_n events from the queue."""
    count = 0
    for _ in range(max_n):
        if not await process_one():
            break
        count += 1
    if count:
        logger.info("batch_processed", count=count)
    return count


def start_schedulers() -> None:
    """
    In production, this would start Celery beat for:
      - hourly analytics snapshot
      - daily persona re-clustering
      - daily bandit reset
    For the reference implementation we just log intent.
    """
    logger.info("schedulers_started")
    logger.info(
        "to_start_workers",
        cmd="celery -A app.services.event_pipeline worker --loglevel=info --concurrency=4",
    )
