"""Personalization endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_permission
from app.database.session import get_db
from app.models import User, Persona
from app.schemas import PersonalizeRequest
from app.services.personalization_service import generate_personalization

router = APIRouter()


@router.post("")
async def personalize(
    body: PersonalizeRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("personalization:write")),
):
    # HARD DB dependency
    result = await db.execute(
        select(User).where(User.id == body.user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    persona_result = await db.execute(
        select(Persona).where(Persona.kind == user.persona_kind)
    )
    persona = persona_result.scalar_one_or_none()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")

    # For causal effects, in production we'd load from causal_effects table.
    # For reference impl, return empty list (template fallback handles it).
    causal_effects = []

    user_dict = {
        "id": user.id,
        "name": user.name,
        "features": user.features if isinstance(user.features, dict) else {},
    }
    persona_dict = {
        "kind": persona.kind,
        "name": persona.name,
    }

    result = await generate_personalization(
        user_dict, persona_dict, causal_effects,
        channel=body.channel or "email",
        tone=body.tone or "professional",
    )
    return result
