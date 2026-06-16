"""Counterfactual endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_permission
from app.database.session import get_db
from app.models import User, Event
from app.schemas import CounterfactualRequest
from app.services.counterfactual_service import run_counterfactual

router = APIRouter()


@router.post("")
async def counterfactual(
    body: CounterfactualRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("counterfactual:write")),
):
    # Load user (HARD DB dependency — no in-memory fallback)
    result = await db.execute(
        select(User).where(User.id == body.user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Load events
    events_result = await db.execute(
        select(Event).where(Event.user_id == body.user_id).order_by(Event.timestamp.asc())
    )
    events = events_result.scalars().all()

    # Load sample of users for causal estimation
    sample_result = await db.execute(select(User).limit(500))
    sample_users = sample_result.scalars().all()

    # Build user dict
    user_features = user.features if isinstance(user.features, dict) else {}
    user_dict = {
        "id": user.id,
        "name": user.name,
        "features": user_features,
        "revenue": user.revenue,
    }

    # Build DataFrame
    import pandas as pd
    rows = []
    for u in sample_users:
        f = u.features if isinstance(u.features, dict) else {}
        rows.append({
            "user_id": u.id,
            "converted": int(u.converted),
            "price_sensitivity": f.get("priceSensitivity", 0.5),
            "urgency_response": f.get("urgencyResponse", 0.5),
            "review_reliance": f.get("reviewReliance", 0.5),
            "trend_affinity": f.get("trendAffinity", 0.5),
            "discount": any(e.discount_seen for e in events if e.user_id == u.id),
            "social_proof": any(e.social_proof_seen for e in events if e.user_id == u.id),
            "product_reviews": any(e.review_seen for e in events if e.user_id == u.id),
            "urgency_messaging": any(e.urgency_seen for e in events if e.user_id == u.id),
        })
    df = pd.DataFrame(rows)

    return await run_counterfactual(user_dict, df)
