"""Personas endpoints."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_permission
from app.database.session import get_db
from app.models import Persona
from app.services.persona_service import list_personas

router = APIRouter()


@router.get("")
async def get_personas(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("personas:read")),
):
    personas = await list_personas(db)
    return {
        "personas": [
            {
                "kind": p.kind,
                "name": p.name,
                "tagline": p.tagline,
                "traits": p.traits,
                "embedding": p.embedding,
                "confidence": p.confidence,
                "member_count": p.member_count,
                "avg_conversion": p.avg_conversion,
                "avg_revenue": p.avg_revenue,
                "top_features": p.top_features,
                "color": p.color,
                "emoji": p.emoji,
            }
            for p in personas
        ]
    }
