"""
PersonaForge — Bandit Service (Thompson Sampling)
===================================================
"""

import math
import random
from typing import Dict, List

from app.core.logging import get_logger

logger = get_logger(__name__)

ARMS = ["discount", "urgency", "social_proof"]
TRUE_RATES = {"discount": 0.18, "urgency": 0.12, "social_proof": 0.15}


def _sample_gamma(shape: float, scale: float = 1.0) -> float:
    """Marsaglia-Tsang gamma sampler."""
    if shape < 1:
        u = random.random()
        return _sample_gamma(shape + 1, scale) * (u ** (1 / shape))
    d = shape - 1 / 3
    c = 1 / math.sqrt(9 * d)
    while True:
        x = _gaussian()
        v = 1 + c * x
        if v <= 0:
            continue
        v = v * v * v
        u = random.random()
        if u < 1 - 0.0331 * x * x * x * x:
            return d * v * scale
        if math.log(u) < 0.5 * x * x + d * (1 - v + math.log(v)):
            return d * v * scale


def _gaussian() -> float:
    u1 = random.random()
    u2 = random.random()
    return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)


def _sample_beta(alpha: float, beta: float) -> float:
    x = _sample_gamma(alpha, 1)
    y = _sample_gamma(beta, 1)
    return x / (x + y)


def create_initial_state() -> Dict:
    return {
        arm: {"alpha": 1.0, "beta": 1.0, "pulls": 0, "rewards": 0, "observed_rate": 0.0}
        for arm in ARMS
    }


def step(state: Dict) -> Dict:
    """Advance one round. Returns new state + step info."""
    new_state = {arm: dict(v) for arm, v in state.items()}
    samples = {arm: _sample_beta(v["alpha"], v["beta"]) for arm, v in new_state.items()}
    for arm in ARMS:
        new_state[arm]["expected_value"] = samples[arm]
    chosen = max(ARMS, key=lambda a: samples[a])
    reward = 1 if random.random() < TRUE_RATES[chosen] else 0
    new_state[chosen]["pulls"] += 1
    new_state[chosen]["rewards"] += reward
    new_state[chosen]["alpha"] += reward
    new_state[chosen]["beta"] += 1 - reward
    new_state[chosen]["observed_rate"] = (
        new_state[chosen]["rewards"] / new_state[chosen]["pulls"]
    )
    return new_state


def run_episodes(state: Dict, n: int) -> Dict:
    for _ in range(n):
        state = step(state)
    return state


def get_best_arm(state: Dict) -> str:
    return max(ARMS, key=lambda a: state[a]["observed_rate"])
