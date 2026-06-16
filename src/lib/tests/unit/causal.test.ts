// ============================================================
// Unit tests — Causal Inference (basic + advanced)
// ============================================================

import { describe, test, expect } from "bun:test";
import { estimateAllCausalEffects } from "@/lib/ml/causal";
import {
  estimatePSM,
  estimateIPW,
  estimateDoublyRobust,
  compareCausalMethods,
} from "@/lib/causal/advanced";
import { generateDataset } from "@/lib/data/generator";
import { TREATMENTS } from "@/lib/types";

const ds = generateDataset(200);

describe("Basic causal engine (backdoor adjustment)", () => {
  test("estimates ATE for all 4 treatments", () => {
    const effects = estimateAllCausalEffects(ds.users);
    expect(effects.length).toBe(4);
    effects.forEach((e) => {
      expect(TREATMENTS).toContain(e.treatment);
      expect(typeof e.ate).toBe("number");
      expect(e.ci_lower).toBeLessThanOrEqual(e.ate);
      expect(e.ci_upper).toBeGreaterThanOrEqual(e.ate);
      expect(e.pValue).toBeGreaterThanOrEqual(0);
      expect(e.pValue).toBeLessThanOrEqual(1);
      expect(e.sampleTreated).toBeGreaterThan(0);
      expect(e.sampleControl).toBeGreaterThan(0);
    });
  });
});

describe("Propensity Score Matching", () => {
  test("produces a finite ATE", () => {
    const result = estimatePSM(ds.users, "discount");
    expect(Number.isFinite(result.ate)).toBe(true);
    expect(result.matchedPairs).toBeGreaterThan(0);
  });
});

describe("Inverse Propensity Weighting", () => {
  test("produces a finite ATE", () => {
    const result = estimateIPW(ds.users, "social_proof");
    expect(Number.isFinite(result.ate)).toBe(true);
    expect(result.effectiveSample).toBeGreaterThan(0);
  });
});

describe("Doubly Robust estimation", () => {
  test("produces a finite ATE", () => {
    const result = estimateDoublyRobust(ds.users, "urgency_messaging");
    expect(Number.isFinite(result.ate)).toBe(true);
    expect(result.nTreated + result.nControl).toBe(ds.users.length);
  });
});

describe("compareCausalMethods", () => {
  test("aggregates all methods for one treatment", () => {
    const cmp = compareCausalMethods(ds.users, "discount");
    expect(cmp.treatment).toBe("discount");
    expect(typeof cmp.backdoor).toBe("number");
    expect(typeof cmp.psm).toBe("number");
    expect(typeof cmp.ipw).toBe("number");
    expect(typeof cmp.doublyRobust).toBe("number");
    expect(typeof cmp.consensus).toBe("number");
    expect(cmp.bootstrap).toHaveProperty("lower");
    expect(cmp.bootstrap).toHaveProperty("upper");
    expect(cmp.bootstrap.lower).toBeLessThanOrEqual(cmp.bootstrap.upper);
  });
});
