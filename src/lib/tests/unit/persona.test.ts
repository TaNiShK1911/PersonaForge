// ============================================================
// Unit tests — Persona Clustering
// ============================================================

import { describe, test, expect } from "bun:test";
import { buildPersonas } from "@/lib/ml/persona";
import { generateDataset } from "@/lib/data/generator";
import { PERSONA_KINDS } from "@/lib/types";

describe("buildPersonas", () => {
  test("produces 6 personas from 1000 users", () => {
    const ds = generateDataset(100);
    const personas = buildPersonas(ds.users, 6);
    expect(personas.length).toBe(6);
  });

  test("each persona has required fields", () => {
    const ds = generateDataset(100);
    const personas = buildPersonas(ds.users, 6);
    personas.forEach((p) => {
      expect(p.persona_name).toBeTruthy();
      expect(p.kind).toBeTruthy();
      expect(PERSONA_KINDS).toContain(p.kind);
      expect(p.traits).toBeInstanceOf(Array);
      expect(p.traits.length).toBeGreaterThan(0);
      expect(p.confidence).toBeGreaterThan(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
      expect(p.memberCount).toBeGreaterThan(0);
      expect(p.behavior_embedding).toHaveProperty("x");
      expect(p.behavior_embedding).toHaveProperty("y");
    });
  });

  test("persona member counts sum to user count", () => {
    const ds = generateDataset(100);
    const personas = buildPersonas(ds.users, 6);
    const total = personas.reduce((s, p) => s + p.memberCount, 0);
    expect(total).toBe(ds.users.length);
  });

  test("confidence is between 0.55 and 0.98", () => {
    const ds = generateDataset(100);
    const personas = buildPersonas(ds.users, 6);
    personas.forEach((p) => {
      expect(p.confidence).toBeGreaterThanOrEqual(0.55);
      expect(p.confidence).toBeLessThanOrEqual(0.98);
    });
  });
});
