"""Analytics endpoints."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_permission
from app.database.session import get_db
from app.models import User, Event, AnalyticsSnapshot, BanditVariant

router = APIRouter()


@router.get("")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("analytics:read")),
):
    # Try latest snapshot
    snap_result = await db.execute(
        select(AnalyticsSnapshot).order_by(AnalyticsSnapshot.date.desc()).limit(1)
    )
    snap = snap_result.scalar_one_or_none()

    if snap:
        return {
            "timestamp": snap.date.isoformat(),
            "total_users": snap.total_users,
            "active_users": snap.active_users,
            "converted_users": snap.converted_users,
            "conversion_rate": snap.conversion_rate,
            "revenue": snap.revenue,
            "avg_order_value": snap.avg_order_value,
            "events": snap.events,
            "bandit_best_arm": snap.bandit_best_arm,
            "bandit_regret": snap.bandit_regret,
            "bandit_rounds": snap.bandit_rounds,
            "persona_distribution": snap.persona_distribution,
        }

    # Fallback: compute live (still hits DB; no in-memory fallback)
    total = (await db.execute(select(func.count(User.id)))).scalar() or 0
    converted = (await db.execute(
        select(func.count(User.id)).where(User.converted == True)
    )).scalar() or 0
    events = (await db.execute(select(func.count(Event.id)))).scalar() or 0
    revenue = (await db.execute(select(func.sum(User.revenue)))).scalar() or 0
    bandit_variants = (await db.execute(select(BanditVariant))).scalars().all()
    best_arm = max(
        [v for v in bandit_variants if v.pulls > 0],
        key=lambda v: v.observed_rate,
        default=None,
    )

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_users": total,
        "active_users": total,
        "converted_users": converted,
        "conversion_rate": (converted / total) if total > 0 else 0,
        "revenue": float(revenue),
        "avg_order_value": float(revenue) / converted if converted > 0 else 0,
        "events": events,
        "bandit_best_arm": best_arm.arm_key if best_arm else None,
        "computed_live": True,
    }
