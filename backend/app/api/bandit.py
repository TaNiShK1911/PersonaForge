"""Bandit endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_permission
from app.database.session import get_db
from app.models import BanditVariant, BanditObservation
from app.schemas import BanditUpdateRequest
from app.services.bandit_service import (
    ARMS, create_initial_state, step, run_episodes, get_best_arm,
)

router = APIRouter()


async def _load_state(db: AsyncSession) -> dict:
    result = await db.execute(select(BanditVariant))
    variants = result.scalars().all()
    state = {}
    for v in variants:
        state[v.arm_key] = {
            "alpha": v.alpha,
            "beta": v.beta,
            "pulls": v.pulls,
            "rewards": v.rewards,
            "observed_rate": v.observed_rate,
        }
    # Fill in any missing arms
    for arm in ARMS:
        if arm not in state:
            state[arm] = {"alpha": 1.0, "beta": 1.0, "pulls": 0, "rewards": 0, "observed_rate": 0.0}
    return state


@router.get("")
async def get_bandit(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("bandit:read")),
):
    state = await _load_state(db)
    history_result = await db.execute(
        select(BanditObservation).order_by(BanditObservation.round.desc()).limit(200)
    )
    history = list(reversed(history_result.scalars().all()))
    best_arm = get_best_arm(state)
    return {
        "arms": state,
        "best_arm": best_arm,
        "total_rounds": sum(v["pulls"] for v in state.values()),
        "history": [
            {
                "round": h.round,
                "chosen": h.chosen_arm if hasattr(h, "chosen_arm") else None,
                "reward": h.reward,
                "regret": h.regret,
            }
            for h in history
        ],
    }


@router.post("/update")
async def update_bandit(
    body: BanditUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("bandit:write")),
):
    state = await _load_state(db)
    if body.reset:
        state = create_initial_state()
    else:
        state = run_episodes(state, body.steps)

    # Persist back
    for arm_key, arm_state in state.items():
        result = await db.execute(
            select(BanditVariant).where(BanditVariant.arm_key == arm_key)
        )
        variant = result.scalar_one_or_none()
        if variant:
            variant.alpha = arm_state["alpha"]
            variant.beta = arm_state["beta"]
            variant.pulls = arm_state["pulls"]
            variant.rewards = arm_state["rewards"]
            variant.observed_rate = arm_state["observed_rate"]

    return {
        "state": state,
        "advanced": body.steps,
        "reset": body.reset,
        "best_arm": get_best_arm(state),
    }
