// PersonaForge — Causal AI Engine
// Estimates Average Treatment Effects (ATE) for marketing treatments
// using a backdoor-adjustment / covariate-matching approach (DoWhy-style).
//
// Treatments: discount, social_proof, product_reviews, urgency_messaging
// Outcome:    conversion (binary)
// Confounders: priceSensitivity, urgencyResponse, reviewReliance, trendAffinity
//
// For each treatment we compute:
//   - P(Y=1 | T=1, X) and P(Y=1 | T=0, X) averaged across the dataset
//   - ATE = E[Y(1) - Y(0)]
//   - Confidence interval via bootstrap
//   - p-value via simple permutation test
// ============================================================

import {
  CausalEffect,
  CausalGraph,
  TreatmentVariable,
  TREATMENTS,
  TREATMENT_META,
  User,
} from "@/lib/types";

interface UserWithTreatment {
  user: User;
  treated: boolean;
  converted: boolean;
}

function getUserTreatmentStatus(
  user: User,
  treatment: TreatmentVariable
): boolean {
  // A user is "treated" if ANY of their events exposed them to that treatment.
  return user.events.some((e) => {
    if (treatment === "discount") return e.discountSeen;
    if (treatment === "social_proof") return e.socialProofSeen;
    if (treatment === "product_reviews") return e.reviewSeen;
    if (treatment === "urgency_messaging") return e.urgencySeen;
    return false;
  });
}

function buildStrata(user: User): string {
  // Coarse covariate strata for backdoor adjustment
  const ps = user.features.priceSensitivity > 0.5 ? "h" : "l";
  const ur = user.features.urgencyResponse > 0.5 ? "h" : "l";
  const rr = user.features.reviewReliance > 0.5 ? "h" : "l";
  const ta = user.features.trendAffinity > 0.5 ? "h" : "l";
  return `${ps}${ur}${rr}${ta}`;
}

function estimateATE(users: User[], treatment: TreatmentVariable): CausalEffect {
  // stratify users
  const strata = new Map<string, UserWithTreatment[]>();
  for (const user of users) {
    const key = buildStrata(user);
    const list = strata.get(key) ?? [];
    list.push({
      user,
      treated: getUserTreatmentStatus(user, treatment),
      converted: user.converted,
    });
    strata.set(key, list);
  }

  // Within each stratum compute treated/control means, weight by stratum size
  let totalWeight = 0;
  let weightedATE = 0;
  let convT = 0;
  let convC = 0;
  let nT = 0;
  let nC = 0;

  for (const [, list] of strata) {
    const t = list.filter((x) => x.treated);
    const c = list.filter((x) => !x.treated);
    if (t.length === 0 || c.length === 0) continue;
    const pt = t.filter((x) => x.converted).length / t.length;
    const pc = c.filter((x) => x.converted).length / c.length;
    const w = list.length;
    weightedATE += (pt - pc) * w;
    totalWeight += w;
    convT += pt * t.length;
    convC += pc * c.length;
    nT += t.length;
    nC += c.length;
  }

  const ate = totalWeight > 0 ? weightedATE / totalWeight : 0;
  const conversionTreated = nT > 0 ? convT / nT : 0;
  const conversionControl = nC > 0 ? convC / nC : 0;

  // Bootstrap CI
  const ci = bootstrapCI(users, treatment, 80);
  // Permutation p-value
  const pValue = permutationPValue(users, treatment, 200);

  return {
    treatment,
    outcome: "conversion",
    ate,
    ci_lower: ci.lower,
    ci_upper: ci.upper,
    pValue,
    sampleTreated: nT,
    sampleControl: nC,
    conversionTreated,
    conversionControl,
  };
}

function bootstrapCI(
  users: User[],
  treatment: TreatmentVariable,
  B: number
): { lower: number; upper: number } {
  const ates: number[] = [];
  const n = users.length;
  for (let b = 0; b < B; b++) {
    // sample with replacement
    const sample: User[] = [];
    for (let i = 0; i < n; i++) {
      sample.push(users[Math.floor(Math.random() * n)]);
    }
    const a = singleATE(sample, treatment);
    ates.push(a);
  }
  ates.sort((a, b) => a - b);
  return {
    lower: ates[Math.floor(B * 0.05)],
    upper: ates[Math.floor(B * 0.95)],
  };
}

function singleATE(users: User[], treatment: TreatmentVariable): number {
  let totalWeight = 0;
  let weightedATE = 0;
  const strata = new Map<string, UserWithTreatment[]>();
  for (const user of users) {
    const key = buildStrata(user);
    const list = strata.get(key) ?? [];
    list.push({
      user,
      treated: getUserTreatmentStatus(user, treatment),
      converted: user.converted,
    });
    strata.set(key, list);
  }
  for (const [, list] of strata) {
    const t = list.filter((x) => x.treated);
    const c = list.filter((x) => !x.treated);
    if (t.length === 0 || c.length === 0) continue;
    const pt = t.filter((x) => x.converted).length / t.length;
    const pc = c.filter((x) => x.converted).length / c.length;
    const w = list.length;
    weightedATE += (pt - pc) * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? weightedATE / totalWeight : 0;
}

function permutationPValue(
  users: User[],
  treatment: TreatmentVariable,
  permutations: number
): number {
  const observed = Math.abs(singleATE(users, treatment));
  let count = 0;
  for (let p = 0; p < permutations; p++) {
    // shuffle treatment assignment within strata
    const permuted = users.map((u) => ({
      user: u,
      treated: getUserTreatmentStatus(u, treatment),
      converted: u.converted,
    }));
    // permute treatment labels (within strata)
    const strata = new Map<string, boolean[]>();
    permuted.forEach((x) => {
      const key = buildStrata(x.user);
      const arr = strata.get(key) ?? [];
      arr.push(x.treated);
      strata.set(key, arr);
    });
    for (const [, arr] of strata) {
      // Fisher-Yates shuffle of arr in place
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    // recompute ATE with permuted labels
    let idx = 0;
    const strataIdx = new Map<string, number>();
    let permutedATE = 0;
    let totalW = 0;
    permuted.forEach((x) => {
      const key = buildStrata(x.user);
      const arr = strata.get(key)!;
      const i = strataIdx.get(key) ?? 0;
      // not the most efficient but ok for permutation test
      void idx;
      void arr;
      void i;
      void permutedATE;
      void totalW;
    });
    // simpler: recompute
    const strata2 = new Map<string, { treated: boolean; converted: boolean }[]>();
    permuted.forEach((x, idx2) => {
      const key = buildStrata(x.user);
      const arr = strata.get(key)!;
      const arr2 = strata2.get(key) ?? [];
      arr2.push({ treated: arr[idx2 % arr.length], converted: x.converted });
      strata2.set(key, arr2);
    });
    let wATE = 0;
    let tW = 0;
    for (const [, list] of strata2) {
      const t = list.filter((x) => x.treated);
      const c = list.filter((x) => !x.treated);
      if (t.length === 0 || c.length === 0) continue;
      const pt = t.filter((x) => x.converted).length / t.length;
      const pc = c.filter((x) => x.converted).length / c.length;
      const w = list.length;
      wATE += (pt - pc) * w;
      tW += w;
    }
    const permutedAte = tW > 0 ? wATE / tW : 0;
    if (Math.abs(permutedAte) >= observed) count++;
  }
  return (count + 1) / (permutations + 1);
}

export function estimateAllCausalEffects(users: User[]): CausalEffect[] {
  return TREATMENTS.map((t) => estimateATE(users, t)).sort(
    (a, b) => Math.abs(b.ate) - Math.abs(a.ate)
  );
}

export function buildCausalGraph(effects: CausalEffect[]): CausalGraph {
  const nodes = [
    ...TREATMENTS.map((t) => ({
      id: t,
      label: TREATMENT_META[t].label,
      type: "treatment" as const,
    })),
    { id: "conversion", label: "Conversion", type: "outcome" as const },
    { id: "price_sens", label: "Price Sensitivity", type: "confounder" as const },
    { id: "urgency_resp", label: "Urgency Response", type: "confounder" as const },
    { id: "review_rely", label: "Review Reliance", type: "confounder" as const },
    { id: "trend_aff", label: "Trend Affinity", type: "confounder" as const },
  ];
  const edges = effects.map((e) => ({
    from: e.treatment,
    to: "conversion" as const,
    weight: e.ate,
  }));
  const confounders = [
    { id: "price_sens", label: "Price Sensitivity", affects: ["discount", "conversion"] },
    { id: "urgency_resp", label: "Urgency Response", affects: ["urgency_messaging", "conversion"] },
    { id: "review_rely", label: "Review Reliance", affects: ["product_reviews", "conversion"] },
    { id: "trend_aff", label: "Trend Affinity", affects: ["social_proof", "conversion"] },
  ];
  return { nodes, edges, confounders };
}
