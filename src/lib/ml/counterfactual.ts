// ============================================================
// PersonaForge — Counterfactual Simulator (V1 - DEPRECATED)
// ============================================================
// DEPRECATED: This is the original counterfactual implementation.
// Production API routes now use counterfactual-v2.ts which supports
// multi-treatment simulation with continuous parameters.
//
// This file is kept for backwards compatibility with existing imports
// in src/lib/ai/content.ts. DO NOT extend this file further.
//
// "What if this user had seen a discount?"
// "What if urgency messaging was removed?"
//
// Uses a structural causal model derived from the ATE estimates:
//   P(convert | T) ≈ baseline * Π_i (1 + ATE_i * [treatment_i applied])
// Each scenario toggles treatments on/off relative to a baseline.
// ============================================================

import {
  CounterfactualResult,
  CounterfactualScenario,
  TreatmentVariable,
  TREATMENTS,
  User,
} from "@/lib/types";
import { estimateAllCausalEffects } from "./causal";

interface CausalModel {
  baseline: number;
  effects: Record<TreatmentVariable, number>;
}

function buildModel(users: User[]): CausalModel {
  const effects = estimateAllCausalEffects(users);
  const baseline =
    users.filter((u) => u.converted).length / Math.max(1, users.length);
  const effMap = {} as Record<TreatmentVariable, number>;
  effects.forEach((e) => (effMap[e.treatment] = e.ate));
  return { baseline, effects: effMap };
}

function predictConversion(
  model: CausalModel,
  user: User,
  treatments: Partial<Record<TreatmentVariable, boolean>>
): number {
  // Start from user's natural conversion propensity
  const userPropensity =
    0.5 *
    (user.features.discountResponse +
      user.features.urgencyResponse * 0.5 +
      user.features.socialProofResponse * 0.5 +
      user.features.reviewReliance * 0.3 +
      user.features.brandAffinity * 0.4);

  let p = model.baseline * 0.4 + userPropensity * 0.6;

  // apply each treatment toggle
  for (const t of TREATMENTS) {
    const applied = treatments[t];
    if (applied === undefined) {
      // Use the user's natural exposure if undefined
      continue;
    }
    const eff = model.effects[t];
    if (applied) {
      // Apply positive effect modulated by user responsiveness
      const responsiveness = userResponsiveness(user, t);
      p = p * (1 + eff * responsiveness);
    } else {
      // Removing a treatment: divide out its contribution
      const eff2 = model.effects[t];
      p = p / (1 + Math.max(0.001, eff2 * 0.5));
    }
  }

  // Also account for treatments NOT specified — assume natural exposure
  // (skip for simplicity)

  return Math.max(0.01, Math.min(0.95, p));
}

function userResponsiveness(user: User, t: TreatmentVariable): number {
  switch (t) {
    case "discount":
      return user.features.discountResponse;
    case "social_proof":
      return user.features.socialProofResponse;
    case "product_reviews":
      return user.features.reviewReliance;
    case "urgency_messaging":
      return user.features.urgencyResponse;
  }
}

function naturalExposure(user: User, t: TreatmentVariable): boolean {
  return user.events.some((e) => {
    if (t === "discount") return e.discountSeen;
    if (t === "social_proof") return e.socialProofSeen;
    if (t === "product_reviews") return e.reviewSeen;
    if (t === "urgency_messaging") return e.urgencySeen;
    return false;
  });
}

function makeScenario(
  id: string,
  label: string,
  description: string,
  treatments: Partial<Record<TreatmentVariable, boolean>>,
  user: User,
  model: CausalModel
): CounterfactualScenario {
  const convProb = predictConversion(model, user, treatments);
  const baselineConv = predictConversion(model, user, {});
  const upliftPct = ((convProb - baselineConv) / Math.max(0.01, baselineConv)) * 100;
  // estimate revenue = convProb * avg order value of this user's persona
  const aov = user.revenue > 0 ? user.revenue : 75;
  return {
    id,
    label,
    description,
    treatments,
    conversionProbability: convProb,
    upliftPct,
    estimatedRevenue: convProb * aov,
  };
}

export function runCounterfactual(
  user: User,
  users: User[]
): CounterfactualResult {
  const model = buildModel(users);

  // Baseline = natural exposure (what the user actually saw)
  const baselineTreatments: Partial<Record<TreatmentVariable, boolean>> = {};
  for (const t of TREATMENTS) baselineTreatments[t] = naturalExposure(user, t);

  const baseline = makeScenario(
    "baseline",
    "Baseline (Natural Exposure)",
    "What the user actually experienced",
    baselineTreatments,
    user,
    model
  );

  // Scenario A: All treatments ON
  const allOn: Partial<Record<TreatmentVariable, boolean>> = {
    discount: true,
    social_proof: true,
    product_reviews: true,
    urgency_messaging: true,
  };
  const scenarioA = makeScenario(
    "all_on",
    "Scenario A: Full Treatment Stack",
    "Discount + Social Proof + Reviews + Urgency all applied",
    allOn,
    user,
    model
  );

  // Scenario B: Discount only
  const scenarioB = makeScenario(
    "discount_only",
    "Scenario B: Discount Only",
    "Only discount applied; other treatments removed",
    {
      discount: true,
      social_proof: false,
      product_reviews: false,
      urgency_messaging: false,
    },
    user,
    model
  );

  // Scenario C: Remove urgency (test the "what if we removed urgency?" question)
  const noUrgency: Partial<Record<TreatmentVariable, boolean>> = {
    ...baselineTreatments,
    urgency_messaging: false,
  };
  const scenarioC = makeScenario(
    "no_urgency",
    "Scenario C: Remove Urgency",
    "Baseline with urgency messaging removed",
    noUrgency,
    user,
    model
  );

  // Scenario D: Personalized — apply only the treatment the user is most responsive to
  const best = TREATMENTS.map((t) => ({
    t,
    eff: model.effects[t] * userResponsiveness(user, t),
  })).sort((a, b) => b.eff - a.eff)[0];
  const personalizedTreatments: Partial<Record<TreatmentVariable, boolean>> = {};
  for (const t of TREATMENTS) personalizedTreatments[t] = t === best.t;
  const scenarioD = makeScenario(
    "personalized",
    "Scenario D: Personalized Best Treatment",
    `Only applies ${best.t.replace("_", " ")} (user's strongest lever)`,
    personalizedTreatments,
    user,
    model
  );

  const scenarios = [scenarioA, scenarioB, scenarioC, scenarioD];
  const winner = scenarios.reduce((best, s) =>
    s.conversionProbability > best.conversionProbability ? s : best
  );

  return { baseline, scenarios, winner };
}

// Allow custom scenario building for the interactive UI
export function buildCustomScenario(
  user: User,
  users: User[],
  treatments: Partial<Record<TreatmentVariable, boolean>>,
  label: string,
  description: string
): CounterfactualScenario {
  const model = buildModel(users);
  return makeScenario(`custom_${Date.now()}`, label, description, treatments, user, model);
}
