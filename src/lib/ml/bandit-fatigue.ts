// ============================================================
// PersonaForge — Bandit with Personalization Fatigue
// ============================================================
// Extends the Thompson Sampling bandit to model diminishing
// returns from repeated exposure to the same treatment for
// the same user. Real-world problem: hyper-personalization
// at scale risks becoming spam.
//
// Decay function: effective_reward = true_rate * fatigueFactor(exposureCount)
// where fatigueFactor decreases with consecutive same-arm pulls for a user.
// ============================================================

import { BanditArm, BANDIT_ARMS } from "@/lib/types";

// Per-user exposure history
export interface UserExposureHistory {
  userId: string;
  exposures: Array<{
    round: number;
    arm: BanditArm;
    reward: number;
    fatigueFactor: number;
  }>;
  consecutiveByArm: Record<BanditArm, number>; // consecutive exposures to each arm
}

export interface BanditStateFatigue {
  arms: Record<
    BanditArm,
    {
      arm: BanditArm;
      alpha: number;
      beta: number;
      pulls: number;
      rewards: number;
      observedRate: number;
      expectedValue: number;
    }
  >;
  userHistories: Record<string, UserExposureHistory>;
  globalHistory: Array<{
    round: number;
    userId: string;
    chosen: BanditArm;
    reward: number;
    fatigueFactor: number;
    cumulativeReward: number;
    regret: number;
  }>;
  totalRounds: number;
  bestArm: BanditArm;
}

// Fatigue decay function: exponential decay
// First exposure = 1.0
// Second exposure = 0.85
// Third exposure = 0.72
// ...decreases asymptotically
function fatigueFactor(consecutiveCount: number): number {
  // Base decay rate (higher = faster fatigue)
  const decayRate = 0.15;
  return Math.exp(-decayRate * consecutiveCount);
}

// Base "true" conversion rates per arm (without fatigue)
const TRUE_RATES: Record<BanditArm, number> = {
  discount: 0.18,
  urgency: 0.12,
  social_proof: 0.15,
};

// Sample from Beta distribution
function sampleBeta(alpha: number, beta: number): number {
  const x = sampleGamma(alpha, 1);
  const y = sampleGamma(beta, 1);
  return x / (x + y);
}

function sampleGamma(shape: number, scale: number): number {
  if (shape < 1) {
    const u = Math.random();
    return sampleGamma(shape + 1, scale) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number, v: number;
    do {
      x = gaussianRandom();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

function gaussianRandom(): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function createFatigueBanditState(): BanditStateFatigue {
  const arms = {} as BanditStateFatigue["arms"];
  for (const arm of BANDIT_ARMS) {
    arms[arm] = {
      arm,
      alpha: 1,
      beta: 1,
      pulls: 0,
      rewards: 0,
      observedRate: 0,
      expectedValue: 0.5,
    };
  }

  return {
    arms,
    userHistories: {},
    globalHistory: [],
    totalRounds: 0,
    bestArm: "discount",
  };
}

/**
 * Step the bandit for a specific user, accounting for fatigue
 */
export function stepBanditForUser(
  state: BanditStateFatigue,
  userId: string
): BanditStateFatigue {
  const newState = JSON.parse(JSON.stringify(state)) as BanditStateFatigue;

  // Initialize user history if first time
  if (!newState.userHistories[userId]) {
    newState.userHistories[userId] = {
      userId,
      exposures: [],
      consecutiveByArm: {
        discount: 0,
        urgency: 0,
        social_proof: 0,
      },
    };
  }

  const userHistory = newState.userHistories[userId];

  // Thompson sampling: sample from each arm's Beta posterior
  let chosen: BanditArm = "discount";
  let chosenSample = -1;
  for (const arm of BANDIT_ARMS) {
    const s = sampleBeta(newState.arms[arm].alpha, newState.arms[arm].beta);
    newState.arms[arm].expectedValue = s;
    if (s > chosenSample) {
      chosenSample = s;
      chosen = arm;
    }
  }

  // Calculate fatigue factor for this user + arm combination
  const consecutiveCount = userHistory.consecutiveByArm[chosen];
  const currentFatigue = fatigueFactor(consecutiveCount);

  // Effective reward rate = true rate × fatigue factor
  const effectiveRate = TRUE_RATES[chosen] * currentFatigue;

  // Observe reward (Bernoulli with effective rate)
  const reward: 0 | 1 = Math.random() < effectiveRate ? 1 : 0;

  // Update arm statistics
  newState.arms[chosen].pulls += 1;
  newState.arms[chosen].rewards += reward;
  newState.arms[chosen].alpha += reward;
  newState.arms[chosen].beta += 1 - reward;
  newState.arms[chosen].observedRate =
    newState.arms[chosen].rewards / newState.arms[chosen].pulls;

  // Update user exposure history
  userHistory.exposures.push({
    round: newState.totalRounds + 1,
    arm: chosen,
    reward,
    fatigueFactor: currentFatigue,
  });

  // Update consecutive counts
  for (const arm of BANDIT_ARMS) {
    if (arm === chosen) {
      userHistory.consecutiveByArm[arm] += 1;
    } else {
      // Reset consecutive count for other arms (user took a break)
      userHistory.consecutiveByArm[arm] = 0;
    }
  }

  // Global cumulative reward and regret
  const prevReward = newState.globalHistory.reduce((s, h) => s + h.reward, 0);
  const cumulativeReward = prevReward + reward;

  // Optimal arm (without fatigue, for regret calculation)
  const optimalArm = (Object.keys(TRUE_RATES) as BanditArm[]).reduce(
    (best, a) => (TRUE_RATES[a] > TRUE_RATES[best] ? a : best)
  );
  const cumulativeOptimal = (newState.totalRounds + 1) * TRUE_RATES[optimalArm];
  const regret = cumulativeOptimal - cumulativeReward;

  // Record global history
  newState.globalHistory.push({
    round: newState.totalRounds + 1,
    userId,
    chosen,
    reward,
    fatigueFactor: currentFatigue,
    cumulativeReward,
    regret,
  });

  newState.totalRounds += 1;

  // Update best arm
  newState.bestArm = BANDIT_ARMS.reduce((best, a) =>
    newState.arms[a].observedRate > newState.arms[best].observedRate ? a : best
  );

  return newState;
}

/**
 * Simulate multiple rounds for a single user (useful for demo/testing)
 */
export function simulateFatigueForUser(
  userId: string,
  rounds: number
): BanditStateFatigue {
  let state = createFatigueBanditState();
  for (let i = 0; i < rounds; i++) {
    state = stepBanditForUser(state, userId);
  }
  return state;
}

/**
 * Get fatigue analytics for a specific user
 */
export function getUserFatigueAnalytics(
  state: BanditStateFatigue,
  userId: string
): {
  totalExposures: number;
  exposuresByArm: Record<BanditArm, number>;
  currentFatigueByArm: Record<BanditArm, number>;
  averageRewardByArm: Record<BanditArm, number>;
  rewardDecayByArm: Record<BanditArm, Array<{ exposure: number; reward: number }>>;
} {
  const userHistory = state.userHistories[userId];
  if (!userHistory) {
    return {
      totalExposures: 0,
      exposuresByArm: { discount: 0, urgency: 0, social_proof: 0 },
      currentFatigueByArm: { discount: 1, urgency: 1, social_proof: 1 },
      averageRewardByArm: { discount: 0, urgency: 0, social_proof: 0 },
      rewardDecayByArm: {
        discount: [],
        urgency: [],
        social_proof: [],
      },
    };
  }

  const exposuresByArm: Record<BanditArm, number> = {
    discount: 0,
    urgency: 0,
    social_proof: 0,
  };

  const rewardsByArm: Record<BanditArm, number[]> = {
    discount: [],
    urgency: [],
    social_proof: [],
  };

  for (const exp of userHistory.exposures) {
    exposuresByArm[exp.arm]++;
    rewardsByArm[exp.arm].push(exp.reward);
  }

  const averageRewardByArm: Record<BanditArm, number> = {} as any;
  for (const arm of BANDIT_ARMS) {
    const rewards = rewardsByArm[arm];
    averageRewardByArm[arm] =
      rewards.length > 0
        ? rewards.reduce((s, r) => s + r, 0) / rewards.length
        : 0;
  }

  // Build decay curve: exposure count → observed reward rate
  const rewardDecayByArm: Record<
    BanditArm,
    Array<{ exposure: number; reward: number }>
  > = {
    discount: [],
    urgency: [],
    social_proof: [],
  };

  for (const arm of BANDIT_ARMS) {
    const armExposures = userHistory.exposures.filter((e) => e.arm === arm);
    armExposures.forEach((exp, idx) => {
      rewardDecayByArm[arm].push({
        exposure: idx + 1,
        reward: exp.reward,
      });
    });
  }

  return {
    totalExposures: userHistory.exposures.length,
    exposuresByArm,
    currentFatigueByArm: userHistory.consecutiveByArm,
    averageRewardByArm,
    rewardDecayByArm,
  };
}
