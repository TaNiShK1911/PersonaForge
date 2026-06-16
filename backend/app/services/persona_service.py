"""
PersonaForge — Persona Service
================================
"""

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Persona, User
from app.schemas import PersonaOut


async def list_personas(db: AsyncSession) -> List[Persona]:
    """Return all personas ordered by member count."""
    result = await db.execute(
        select(Persona).where(Persona.deleted_at.is_(None)).order_by(Persona.member_count.desc())
    )
    return list(result.scalars().all())


async def get_persona(db: AsyncSession, kind: str) -> Optional[Persona]:
    """Get a single persona by kind."""
    result = await db.execute(
        select(Persona).where(Persona.kind == kind, Persona.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def upsert_persona(db: AsyncSession, kind: str, data: dict) -> Persona:
    """Insert or update a persona."""
    existing = await get_persona(db, kind)
    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        await db.flush()
        return existing
    p = Persona(kind=kind, **data)
    db.add(p)
    await db.flush()
    return p
