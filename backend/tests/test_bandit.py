"""
Test: bandit service (no DB dependency).
"""
import pytest
from app.services.bandit_service import (
    ARMS, create_initial_state, step, run_episodes, get_best_arm,
)


def test_initial_state():
    state = create_initial_state()
    assert len(state) == 3
    for arm in ARMS:
        assert state[arm]["alpha"] == 1.0
        assert state[arm]["beta"] == 1.0
        assert state[arm]["pulls"] == 0


def test_step_advances_one_round():
    state = create_initial_state()
    new_state = step(state)
    total_pulls = sum(v["pulls"] for v in new_state.values())
    assert total_pulls == 1


def test_convergence_after_200_rounds():
    state = create_initial_state()
    state = run_episodes(state, 200)
    total_pulls = sum(v["pulls"] for v in state.values())
    assert total_pulls == 200
    best = get_best_arm(state)
    # Discount (0.18) should usually win
    assert best in ARMS


def test_all_arms_pulled_in_first_30():
    state = create_initial_state()
    state = run_episodes(state, 30)
    for arm in ARMS:
        assert state[arm]["pulls"] > 0
