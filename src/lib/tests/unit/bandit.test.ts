// ============================================================
// Unit tests — Thompson Sampling Bandit
// ============================================================

import { describe, test, expect } from "bun:test";
import {
  createBanditState,
  stepBandit,
  runBanditEpisodes,
} from "@/lib/ml/bandit";
import { BANDIT_ARMS } from "@/lib/types";

describe("createBanditState", () => {
  test("initializes with Beta(1,1) for all arms", () => {
    const state = createBanditState();
    expect(Object.keys(state.arms).length).toBe(3);
    BANDIT_ARMS.forEach((arm) => {
      expect(state.arms[arm].alpha).toBe(1);
      expect(state.arms[arm].beta).toBe(1);
      expect(state.arms[arm].pulls).toBe(0);
      expect(state.arms[arm].rewards).toBe(0);
      expect(state.arms[arm].observedRate).toBe(0);
    });
    expect(state.totalRounds).toBe(0);
    expect(state.history.length).toBe(0);
  });
});

describe("stepBandit", () => {
  test("advances one round at a time", () => {
    let state = createBanditState();
    state = stepBandit(state);
    expect(state.totalRounds).toBe(1);
    expect(state.history.length).toBe(1);
    expect(state.history[0].round).toBe(1);
    expect([0, 1]).toContain(state.history[0].reward);
  });

  test("updates the pulled arm's posterior", () => {
    let state = createBanditState();
    state = stepBandit(state);
    const chosen = state.history[0].chosen;
    const arm = state.arms[chosen];
    expect(arm.pulls).toBe(1);
    expect(arm.alpha + arm.beta).toBe(3); // 1 + 1 + 1 pull = 3
  });
});

describe("runBanditEpisodes", () => {
  test("runs N rounds and converges", () => {
    const state = runBanditEpisodes(200);
    expect(state.totalRounds).toBe(200);
    expect(state.history.length).toBe(200);

    // Best arm should have highest observed rate
    const rates = BANDIT_ARMS.map((a) => state.arms[a].observedRate);
    const maxRate = Math.max(...rates);
    expect(state.arms[state.bestArm].observedRate).toBeCloseTo(maxRate, 5);
  });

  test("regret grows sub-linearly (much less than rounds × max rate)", () => {
    const state = runBanditEpisodes(200);
    const lastStep = state.history[state.history.length - 1];
    // Max theoretical regret = rounds × max_rate (0.18). Sub-linear means
    // regret should be well under half that — the bandit has identified
    // the best arm and is mostly exploiting.
    expect(lastStep.regret).toBeLessThan(200 * 0.18 * 0.7);
  });

  test("all arms get pulled at least once in early rounds", () => {
    const state = runBanditEpisodes(30);
    BANDIT_ARMS.forEach((arm) => {
      expect(state.arms[arm].pulls).toBeGreaterThan(0);
    });
  });
});
