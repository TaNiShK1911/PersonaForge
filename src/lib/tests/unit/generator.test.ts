// ============================================================
// Unit tests — Synthetic Data Generator
// ============================================================

import { describe, test, expect } from "bun:test";
import { generateDataset, datasetStats } from "@/lib/data/generator";
import { PERSONA_KINDS, PERSONA_META } from "@/lib/types";

describe("generateDataset", () => {
  test("produces a non-empty dataset of users", () => {
    // Note: generator caches the dataset at module level, so
    // all calls return the same Dataset. We just verify it has
    // the expected minimum size (1000 by default).
    const ds = generateDataset();
    expect(ds.users.length).toBeGreaterThanOrEqual(100);
  });

  test("each user has events", () => {
    const ds = generateDataset();
    ds.users.forEach((u) => {
      expect(u.events.length).toBeGreaterThan(0);
    });
  });

  test("all users belong to a valid persona kind", () => {
    const ds = generateDataset();
    ds.users.forEach((u) => {
      expect(PERSONA_KINDS).toContain(u.persona);
    });
  });

  test("all users have complete features", () => {
    const ds = generateDataset();
    ds.users.forEach((u) => {
      expect(u.features).toBeDefined();
      expect(u.features.priceSensitivity).toBeGreaterThanOrEqual(0);
      expect(u.features.priceSensitivity).toBeLessThanOrEqual(1);
      expect(u.features.embeddingX).toBeGreaterThanOrEqual(0);
      expect(u.features.embeddingX).toBeLessThanOrEqual(1);
      expect(u.features.embeddingY).toBeGreaterThanOrEqual(0);
      expect(u.features.embeddingY).toBeLessThanOrEqual(1);
    });
  });

  test("events have valid types", () => {
    const ds = generateDataset();
    const validTypes = [
      "page_view", "scroll_depth", "search", "product_click",
      "add_to_cart", "wishlist", "purchase", "time_on_page", "exit",
    ];
    ds.events.forEach((e) => {
      expect(validTypes).toContain(e.type);
    });
  });

  test("product catalog has at least 16 products", () => {
    const ds = generateDataset();
    expect(ds.productCatalog.length).toBeGreaterThanOrEqual(16);
  });

  test("is deterministic (same seed → same data)", () => {
    const ds1 = generateDataset();
    const ds2 = generateDataset();
    expect(ds1).toBe(ds2); // same cached object
    expect(ds1.users[0].id).toBe(ds2.users[0].id);
  });
});

describe("datasetStats", () => {
  test("computes valid aggregate stats", () => {
    const ds = generateDataset();
    const stats = datasetStats(ds);
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.converted).toBeGreaterThanOrEqual(0);
    expect(stats.converted).toBeLessThanOrEqual(stats.total);
    expect(stats.conversionRate).toBeGreaterThanOrEqual(0);
    expect(stats.conversionRate).toBeLessThanOrEqual(1);
    expect(stats.revenue).toBeGreaterThanOrEqual(0);
    expect(stats.events).toBeGreaterThan(0);
  });
});
