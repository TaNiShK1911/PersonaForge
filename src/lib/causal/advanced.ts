// ============================================================
// PersonaForge — Advanced Causal Inference Methods
// ============================================================
// Extends the basic backdoor-adjustment ATE estimator with:
//   - Propensity Score Matching (PSM)
//   - Inverse Propensity Weighting (IPW)
//   - Doubly Robust Estimation (DR)
//   - Bootstrap confidence intervals (enhanced)
//   - Permutation testing (enhanced)
//
// These methods are exported alongside the existing
// estimateAllCausalEffects() in lib/ml/causal.ts — they do
// NOT replace it; they augment it.
// ============================================================

import { CausalEffect, TreatmentVariable, User } from "@/lib/types";
import { TREATMENTS } from "@/lib/types";

// ---------- Propensity Score Model ----------
// Logistic regression (gradient descent) to estimate P(T=1 | X)
// where X = confounders (price sens, urgency resp, review rely, trend aff)

interface LogisticRegression {
  weights: number[];
  bias: number;
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function features(user: User): number[] {
  return [
    user.features.priceSensitivity,
    user.features.urgencyResponse,
    user.features.reviewReliance,
    user.features.trendAffinity,
    user.features.brandAffinity,
    user.features.discountResponse,
  ];
}

function trainLogisticRegression(
  samples: { x: number[]; y: number }[],
  iters = 200,
  lr = 0.05
): LogisticRegression {
  if (samples.length === 0) {
    return { weights: [0, 0, 0, 0, 0, 0], bias: 0 };
  }
  const dim = samples[0].x.length;
  const weights = new Array(dim).fill(0);
  let bias = 0;

  for (let iter = 0; iter < iters; iter++) {
    const gradW = new Array(dim).fill(0);
    let gradB = 0;
    for (const s of samples) {
      const z = bias + s.x.reduce((a, v, i) => a + v * weights[i], 0);
      const pred = sigmoid(z);
      const err = pred - s.y;
      for (let i = 0; i < dim; i++) gradW[i] += err * s.x[i];
      gradB += err;
    }
    for (let i = 0; i < dim; i++) {
      weights[i] -= (lr * gradW[i]) / samples.length;
    }
    bias -= (lr * gradB) / samples.length;
  }
  return { weights, bias };
}

function predictPropensity(model: LogisticRegression, x: number[]): number {
  return sigmoid(model.bias + x.reduce((a, v, i) => a + v * model.weights[i], 0));
}

// ---------- Propensity Score Matching (PSM) ----------

export function estimatePSM(
  users: User[],
  treatment: TreatmentVariable
): { ate: number; matchedPairs: number } {
  const treated = users.filter((u) => wasTreated(u, treatment));
  const control = users.filter((u) => !wasTreated(u, treatment));
  if (treated.length === 0 || control.length === 0) {
    return { ate: 0, matchedPairs: 0 };
  }

  // Train propensity model on observed treatment assignment
  const samples = users.map((u) => ({
    x: features(u),
    y: wasTreated(u, treatment) ? 1 : 0,
  }));
  const model = trainLogisticRegression(samples);

  // Compute propensity scores
  const treatedWithPS = treated.map((u) => ({
    user: u,
    ps: predictPropensity(model, features(u)),
  }));
  const controlWithPS = control.map((u) => ({
    user: u,
    ps: predictPropensity(model, features(u)),
  }));

  // Greedy 1:1 matching with caliper
  const caliper = 0.1;
  const usedControl = new Set<number>();
  let ateSum = 0;
  let matchedPairs = 0;

  for (const t of treatedWithPS) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < controlWithPS.length; i++) {
      if (usedControl.has(i)) continue;
      const dist = Math.abs(t.ps - controlWithPS[i].ps);
      if (dist < caliper && dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      usedControl.add(bestIdx);
      const tOutcome = t.user.converted ? 1 : 0;
      const cOutcome = controlWithPS[bestIdx].user.converted ? 1 : 0;
      ateSum += tOutcome - cOutcome;
      matchedPairs++;
    }
  }

  return {
    ate: matchedPairs > 0 ? ateSum / matchedPairs : 0,
    matchedPairs,
  };
}

// ---------- Inverse Propensity Weighting (IPW) ----------

export function estimateIPW(
  users: User[],
  treatment: TreatmentVariable
): { ate: number; effectiveSample: number } {
  const samples = users.map((u) => ({
    x: features(u),
    y: wasTreated(u, treatment) ? 1 : 0,
  }));
  const model = trainLogisticRegression(samples);

  let weightedTreatedSum = 0;
  let weightedTreatedN = 0;
  let weightedControlSum = 0;
  let weightedControlN = 0;

  for (const u of users) {
    const ps = predictPropensity(model, features(u));
    const clipped = Math.max(0.01, Math.min(0.99, ps));
    const outcome = u.converted ? 1 : 0;
    if (wasTreated(u, treatment)) {
      weightedTreatedSum += outcome / clipped;
      weightedTreatedN += 1 / clipped;
    } else {
      weightedControlSum += outcome / (1 - clipped);
      weightedControlN += 1 / (1 - clipped);
    }
  }

  if (weightedTreatedN === 0 || weightedControlN === 0) {
    return { ate: 0, effectiveSample: 0 };
  }

  const muT = weightedTreatedSum / weightedTreatedN;
  const muC = weightedControlSum / weightedControlN;

  return {
    ate: muT - muC,
    effectiveSample:
      (weightedTreatedN + weightedControlN) / users.length,
  };
}

// ---------- Doubly Robust Estimation (DR) ----------

// Combines propensity weighting with outcome regression for
// consistent estimates if either model is correctly specified.

export function estimateDoublyRobust(
  users: User[],
  treatment: TreatmentVariable
): { ate: number; nTreated: number; nControl: number } {
  const treated = users.filter((u) => wasTreated(u, treatment));
  const control = users.filter((u) => !wasTreated(u, treatment));

  if (treated.length === 0 || control.length === 0) {
    return { ate: 0, nTreated: treated.length, nControl: control.length };
  }

  // Train outcome models: mu_1(X) = E[Y | T=1, X], mu_0(X) = E[Y | T=0, X]
  // Using simple linear regression for the demo
  const mu1Model = trainLinearRegression(
    treated.map((u) => ({ x: features(u), y: u.converted ? 1 : 0 }))
  );
  const mu0Model = trainLinearRegression(
    control.map((u) => ({ x: features(u), y: u.converted ? 1 : 0 }))
  );

  // Propensity model
  const psModel = trainLogisticRegression(
    users.map((u) => ({ x: features(u), y: wasTreated(u, treatment) ? 1 : 0 }))
  );

  // DR estimator: ATE = 1/n * Σ [T*Y - T*μ₁(X) - (T-e(X))*(Y-μ₁(X))/e(X)
  //                                 + (1-T)*μ₀(X) + (T-e(X))*(Y-μ₀(X))/(1-e(X))]
  // Simplified: ATE = 1/n * Σ [μ₁(X) - μ₀(X) + T*(Y-μ₁(X))/e(X) - (1-T)*(Y-μ₀(X))/(1-e(X))]

  let sum = 0;
  for (const u of users) {
    const x = features(u);
    const ps = Math.max(0.05, Math.min(0.95, predictPropensity(psModel, x)));
    const mu1 = predictLinear(mu1Model, x);
    const mu0 = predictLinear(mu0Model, x);
    const T = wasTreated(u, treatment) ? 1 : 0;
    const Y = u.converted ? 1 : 0;

    const dr1 = mu1 + (T * (Y - mu1)) / ps;
    const dr0 = mu0 + ((1 - T) * (Y - mu0)) / (1 - ps);
    sum += dr1 - dr0;
  }

  return {
    ate: sum / users.length,
    nTreated: treated.length,
    nControl: control.length,
  };
}

// ---------- Linear regression (for outcome model in DR) ----------

interface LinearRegression {
  weights: number[];
  bias: number;
}

function trainLinearRegression(
  samples: { x: number[]; y: number }[],
  iters = 200,
  lr = 0.05
): LinearRegression {
  if (samples.length === 0) {
    return { weights: [0, 0, 0, 0, 0, 0], bias: 0 };
  }
  const dim = samples[0].x.length;
  const weights = new Array(dim).fill(0);
  let bias = 0;
  for (let iter = 0; iter < iters; iter++) {
    const gradW = new Array(dim).fill(0);
    let gradB = 0;
    for (const s of samples) {
      const pred = bias + s.x.reduce((a, v, i) => a + v * weights[i], 0);
      const err = pred - s.y;
      for (let i = 0; i < dim; i++) gradW[i] += err * s.x[i];
      gradB += err;
    }
    for (let i = 0; i < dim; i++) {
      weights[i] -= (lr * gradW[i]) / samples.length;
    }
    bias -= (lr * gradB) / samples.length;
  }
  return { weights, bias };
}

function predictLinear(model: LinearRegression, x: number[]): number {
  return model.bias + x.reduce((a, v, i) => a + v * model.weights[i], 0);
}

// ---------- Bootstrap CIs (enhanced) ----------

export function bootstrapCIs(
  users: User[],
  treatment: TreatmentVariable,
  estimator: (u: User[], t: TreatmentVariable) => { ate: number },
  B = 200
): { lower: number; upper: number; mean: number; std: number } {
  const ates: number[] = [];
  const n = users.length;
  for (let b = 0; b < B; b++) {
    const sample: User[] = [];
    for (let i = 0; i < n; i++) {
      sample.push(users[Math.floor(Math.random() * n)]);
    }
    ates.push(estimator(sample, treatment).ate);
  }
  ates.sort((a, b) => a - b);
  const mean = ates.reduce((a, b) => a + b, 0) / ates.length;
  const variance = ates.reduce((s, v) => s + (v - mean) ** 2, 0) / ates.length;
  return {
    lower: ates[Math.floor(B * 0.025)],
    upper: ates[Math.floor(B * 0.975)],
    mean,
    std: Math.sqrt(variance),
  };
}

// ---------- Multi-method comparison (production API) ----------

export interface CausalMethodComparison {
  treatment: TreatmentVariable;
  backdoor: number;          // existing method
  psm: number;
  ipw: number;
  doublyRobust: number;
  bootstrap: { lower: number; upper: number; mean: number; std: number };
  consensus: number;         // weighted avg of all methods
  methodsAgree: boolean;     // true if all methods within 0.02 of consensus
}

export function compareCausalMethods(
  users: User[],
  treatment: TreatmentVariable
): CausalMethodComparison {
  // Backdoor ATE — call existing estimator from lib/ml/causal
  // (re-implemented minimally here to avoid circular imports)
  const backdoor = quickBackdoor(users, treatment);
  const psm = estimatePSM(users, treatment).ate;
  const ipw = estimateIPW(users, treatment).ate;
  const dr = estimateDoublyRobust(users, treatment).ate;
  const bootstrap = bootstrapCIs(users, treatment, (u, t) => ({ ate: quickBackdoor(u, t) }), 100);

  // Consensus: weighted average (DR gets highest weight per literature)
  const consensus =
    0.2 * backdoor + 0.2 * psm + 0.2 * ipw + 0.4 * dr;

  const methodsAgree =
    [backdoor, psm, ipw, dr].every((m) => Math.abs(m - consensus) < 0.03);

  return {
    treatment,
    backdoor,
    psm,
    ipw,
    doublyRobust: dr,
    bootstrap,
    consensus,
    methodsAgree,
  };
}

export function compareAllTreatments(
  users: User[]
): CausalMethodComparison[] {
  return TREATMENTS.map((t) => compareCausalMethods(users, t));
}

// ---------- Helpers ----------

function wasTreated(user: User, treatment: TreatmentVariable): boolean {
  return user.events.some((e) => {
    if (treatment === "discount") return e.discountSeen;
    if (treatment === "social_proof") return e.socialProofSeen;
    if (treatment === "product_reviews") return e.reviewSeen;
    if (treatment === "urgency_messaging") return e.urgencySeen;
    return false;
  });
}

// Minimal backdoor ATE for bootstrap (avoids circular import with lib/ml/causal)
function quickBackdoor(users: User[], treatment: TreatmentVariable): number {
  const strata = new Map<string, { t: number[]; c: number[] }>();
  for (const u of users) {
    const key = `${u.features.priceSensitivity > 0.5 ? "h" : "l"}${u.features.urgencyResponse > 0.5 ? "h" : "l"}${u.features.reviewReliance > 0.5 ? "h" : "l"}`;
    const s = strata.get(key) ?? { t: [], c: [] };
    if (wasTreated(u, treatment)) s.t.push(u.converted ? 1 : 0);
    else s.c.push(u.converted ? 1 : 0);
    strata.set(key, s);
  }
  let totalW = 0;
  let weightedATE = 0;
  for (const s of strata.values()) {
    if (s.t.length === 0 || s.c.length === 0) continue;
    const pt = s.t.reduce((a, b) => a + b, 0) / s.t.length;
    const pc = s.c.reduce((a, b) => a + b, 0) / s.c.length;
    const w = s.t.length + s.c.length;
    weightedATE += (pt - pc) * w;
    totalW += w;
  }
  return totalW > 0 ? weightedATE / totalW : 0;
}
