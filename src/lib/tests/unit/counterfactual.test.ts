// ============================================================
// Unit tests — Counterfactual Engine (V1 + V2)
// ============================================================

import { describe, test, expect } from "bun:test";
import { runCounterfactual } from "@/lib/ml/counterfactual";
import { runCounterfactualV2 } from "@/lib/ml/counterfactual-v2";
import { generateDataset } from "@/lib/data/generator";

const ds = generateDataset(100);
const user = ds.users[0];

describe("runCounterfactual (V1 — backwards compat)", () => {
  test("produces baseline + 4 scenarios + winner", () => {
    const result = runCounterfactual(user, ds.users);
    expect(result.baseline).toBeDefined();
    expect(result.scenarios.length).toBe(4);
    expect(result.winner).toBeDefined();
    expect(result.scenarios).toContain(result.winner);
  });

  test("all scenarios have valid conversion probabilities", () => {
    const result = runCounterfactual(user, ds.users);
    [result.baseline, ...result.scenarios].forEach((s) => {
      expect(s.conversionProbability).toBeGreaterThan(0);
      expect(s.conversionProbability).toBeLessThanOrEqual(1);
      expect(Number.isFinite(s.upliftPct)).toBe(true);
      expect(s.estimatedRevenue).toBeGreaterThanOrEqual(0);
    });
  });

  test("winner has highest conversion probability", () => {
    const result = runCounterfactual(user, ds.users);
    const allProbs = [result.baseline, ...result.scenarios].map((s) => s.conversionProbability);
    const max = Math.max(...allProbs.filter((_, i) => i > 0)); // exclude baseline
    expect(result.winner.conversionProbability).toBeGreaterThanOrEqual(max - 0.001);
  });
});

describe("runCounterfactualV2 (upgraded — multi-treatment)", () => {
  test("produces baseline + scenarios + winner", () => {
    const result = runCounterfactualV2(user, ds.users);
    expect(result.baseline).toBeDefined();
    expect(result.scenarios.length).toBeGreaterThan(0);
    expect(result.winner).toBeDefined();
  });

  test("includes confidence interval and probability shift", () => {
    const result = runCounterfactualV2(user, ds.users);
    expect(result.confidenceInterval.lower).toBeLessThanOrEqual(result.confidenceInterval.upper);
    expect(Number.isFinite(result.probabilityShift)).toBe(true);
    expect(typeof result.recommendation).toBe("string");
    expect(result.recommendation.length).toBeGreaterThan(0);
  });

  test("method comparison covers all 4 treatments", () => {
    const result = runCounterfactualV2(user, ds.users);
    expect(result.methodComparison.length).toBe(4);
  });
});
