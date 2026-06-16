"""Users endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_permission
from app.database.session import get_db
from app.models import User, Event
from app.schemas import UserListResponse, UserOut

router = APIRouter()


@router.get("", response_model=UserListResponse)
async def list_users(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    persona: Optional[str] = None,
    search: Optional[str] = Query(None, max_length=64),
    converted: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("users:read")),
):
    where = [User.deleted_at.is_(None)]
    if persona:
        where.append(User.persona_kind == persona)
    if converted is not None:
        where.append(User.converted == (converted == "true"))
    if search:
        where.append(
            or_(
                User.name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.id.ilike(f"%{search}%"),
            )
        )

    result = await db.execute(
        select(User).where(*where).order_by(User.created_at.desc()).limit(limit).offset(offset)
    )
    users = result.scalars().all()
    count_result = await db.execute(select(func.count(User.id)).where(*where))
    total = count_result.scalar() or 0

    return {
        "users": [UserOut.model_validate(u, from_attributes=True) for u in users],
        "pagination": {
            "limit": limit,
            "offset": offset,
            "total": total,
            "has_more": offset + len(users) < total,
        },
    }


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("users:read")),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut.model_validate(user, from_attributes=True)
