"""Events endpoints — ingest + list."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_permission
from app.database.session import get_db
from app.models import Event
from app.schemas import EventSchema, EventBatch
from app.services.event_pipeline import enqueue_event, enqueue_batch

router = APIRouter()


@router.post("", status_code=202)
async def ingest_events(
    body: dict,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("events:write")),
):
    """Ingest single or batch events. Queued for async processing."""
    # Validate
    if "events" in body and isinstance(body["events"], list):
        batch = EventBatch(events=[EventSchema(**e) for e in body["events"]])
        count = await enqueue_batch([e.model_dump() for e in batch.events])
        return {"accepted": count, "queued": True, "message": "Batch queued for processing"}
    else:
        event = EventSchema(**body)
        await enqueue_event(event.model_dump())
        return {"accepted": 1, "queued": True, "message": "Event queued for processing"}


@router.get("")
async def list_events(
    user_id: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("events:read")),
):
    """List persisted events with filters. Returns real DB records."""
    where = []
    if user_id:
        where.append(Event.user_id == user_id)
    if event_type:
        where.append(Event.type == event_type)

    result = await db.execute(
        select(Event).where(*where).order_by(Event.timestamp.desc()).limit(limit).offset(offset)
    )
    events = result.scalars().all()
    count_result = await db.execute(select(func.count(Event.id)).where(*where))
    total = count_result.scalar() or 0

    return {
        "events": [
            {
                "id": e.id,
                "user_id": e.user_id,
                "type": e.type,
                "timestamp": e.timestamp,
                "page_depth": e.page_depth,
                "product_id": e.product_id,
                "query": e.query,
                "scroll_pct": e.scroll_pct,
                "dwell_sec": e.dwell_sec,
                "price": e.price,
                "discount_seen": e.discount_seen,
                "social_proof_seen": e.social_proof_seen,
                "review_seen": e.review_seen,
                "urgency_seen": e.urgency_seen,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ],
        "pagination": {
            "limit": limit,
            "offset": offset,
            "total": total,
            "has_more": offset + len(events) < total,
        },
    }
