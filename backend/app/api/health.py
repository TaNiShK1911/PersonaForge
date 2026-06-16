"""Health endpoint."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app import __version__
from app.config import settings
from app.database.session import get_db
from app.database.redis import get_redis

router = APIRouter()


@router.get("")
async def health(db: AsyncSession = Depends(get_db)):
    """Aggregated health check."""
    services = {}

    # Database
    try:
        await db.execute(text("SELECT 1"))
        services["database"] = {"status": "up"}
    except Exception as e:
        services["database"] = {"status": "down", "error": str(e)}

    # Redis
    try:
        redis = await get_redis()
        await redis.ping()
        services["cache"] = {"status": "up"}
    except Exception as e:
        services["cache"] = {"status": "down", "error": str(e)}

    # AI provider
    if settings.anthropic_api_key:
        ai = "claude"
    elif settings.gemini_api_key:
        ai = "gemini"
    elif settings.openai_api_key:
        ai = "openai"
    else:
        ai = "template"
    services["ai_provider"] = {"status": "up" if ai != "template" else "degraded", "active": ai}

    services["ml"] = {"status": "up", "modules": ["intent", "persona", "causal", "counterfactual", "bandit"]}

    any_down = any(s["status"] == "down" for s in services.values())
    any_degraded = any(s["status"] == "degraded" for s in services.values())

    overall = "unhealthy" if any_down else ("degraded" if any_degraded else "healthy")
    return {
        "status": overall,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": __version__,
        "services": services,
    }
