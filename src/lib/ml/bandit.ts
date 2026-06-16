// PersonaForge — Multi-Armed Bandit (Thompson Sampling)
// Three arms:
//   A · Discount Message
//   B · Urgency Message
//   C · Social Proof Message
//
// Each arm has a Beta(alpha, beta) posterior updated on every pull.
// On each step we sample from each posterior and pick the highest.
// ============================================================

import {
  BanditArm,
  BanditState,
  BanditStep,
  BANDIT_ARMS,
  ARM_META,
} from "@/lib/types";

// per-arm base conversion rate (the "true" hidden reward)
const TRUE_RATES: Record<BanditArm, number> = {
  discount: 0.18,
  urgency: 0.12,
  social_proof: 0.15,
};

// Sample from Beta(alpha, beta) using gamma distribution
function sampleBeta(alpha: number, beta: number): number {
  const x = sampleGamma(alpha, 1);
  const y = sampleGamma(beta, 1);
  return x / (x + y);
}

// Marsaglia-Tsang gamma sampler
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

export function createBanditState(): BanditState {
  const arms = {} as Record<BanditArm, BanditState["arms"][BanditArm]>;
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
    history: [],
    totalRounds: 0,
    explorationRate: 0,
    exploitationRate: 0,
    bestArm: "discount",
    conversionImprovement: 0,
  };
}

export function stepBandit(state: BanditState): BanditState {
  const newArms = JSON.parse(JSON.stringify(state.arms)) as BanditState["arms"];

  // Thompson sampling: sample from each arm's Beta posterior
  const samples: Record<BanditArm, number> = {} as Record<BanditArm, number>;
  let chosen: BanditArm = "discount";
  let chosenSample = -1;
  for (const arm of BANDIT_ARMS) {
    const s = sampleBeta(newArms[arm].alpha, newArms[arm].beta);
    samples[arm] = s;
    newArms[arm].expectedValue = s;
    if (s > chosenSample) {
      chosenSample = s;
      chosen = arm;
    }
  }

  // Pull the chosen arm — observe reward (Bernoulli with true rate)
  const reward: 0 | 1 = Math.random() < TRUE_RATES[chosen] ? 1 : 0;
  newArms[chosen].pulls += 1;
  newArms[chosen].rewards += reward;
  newArms[chosen].alpha += reward;
  newArms[chosen].beta += 1 - reward;
  newArms[chosen].observedRate =
    newArms[chosen].rewards / newArms[chosen].pulls;

  // cumulative reward + regret
  const prevReward = state.history.reduce((s, h) => s + h.reward, 0);
  const cumulativeReward = prevReward + reward;
  const optimalArm = (Object.keys(TRUE_RATES) as BanditArm[]).reduce((best, a) =>
    TRUE_RATES[a] > TRUE_RATES[best] ? a : best
  );
  // Cumulative optimal = (rounds so far including this one) × optimal arm's true rate
  const cumulativeOptimal = (state.history.length + 1) * TRUE_RATES[optimalArm];
  const regret = cumulativeOptimal - cumulativeReward;

  // exploration = pulling a non-optimal-observed arm
  // exploitation = pulling the arm with highest observed rate
  const observedBest = BANDIT_ARMS.reduce((best, a) =>
    newArms[a].observedRate > newArms[best].observedRate ? a : best
  );
  const isExploration = chosen !== observedBest || newArms[chosen].pulls < 5;

  const newStep: BanditStep = {
    round: state.totalRounds + 1,
    chosen,
    reward,
    cumulativeReward,
    cumulativeOptimal,
    regret,
    explorationRate: 0, // computed below as running avg
  };

  // Compute running exploration rate over last 20 pulls
  const recent = [...state.history.slice(-19), newStep];
  const recentExploration = recent.filter((s, i) => {
    // recompute observedBest at each step's snapshot — approx by current
    void i;
    return s.chosen !== observedBest;
  }).length / recent.length;
  newStep.explorationRate = recentExploration;

  const history = [...state.history, newStep];

  // best arm = arm with highest observed rate
  const bestArm = BANDIT_ARMS.reduce((best, a) =>
    newArms[a].observedRate > newArms[best].observedRate ? a : best
  );

  // conversion improvement = (best arm rate - mean of other arms rates)
  const others = BANDIT_ARMS.filter((a) => a !== bestArm);
  const otherAvg =
    others.reduce((s, a) => s + newArms[a].observedRate, 0) / others.length;
  const conversionImprovement =
    otherAvg > 0
      ? ((newArms[bestArm].observedRate - otherAvg) / otherAvg) * 100
      : 0;

  return {
    arms: newArms,
    history,
    totalRounds: state.totalRounds + 1,
    explorationRate: recentExploration,
    exploitationRate: 1 - recentExploration,
    bestArm,
    conversionImprovement,
  };
}

export function runBanditEpisodes(rounds: number): BanditState {
  let state = createBanditState();
  for (let i = 0; i < rounds; i++) state = stepBandit(state);
  return state;
}

export { ARM_META, BANDIT_ARMS };
