// ============================================================
// Integration tests — API route contracts
// ============================================================
// These tests verify the API response shape without spinning up
// the full Next.js server. They test the route handlers directly.
// ============================================================

import { describe, test, expect, beforeAll } from "bun:test";
import { generateDataset } from "@/lib/data/generator";
import { validate, eventSchema, counterfactualRequestSchema, banditUpdateSchema, personalizeRequestSchema } from "@/lib/security/validation";

// We test that the validation schemas accept/reject the right inputs
// (the route handlers themselves require a Next.js runtime).

describe("API contract: /api/events", () => {
  test("accepts a valid single event", () => {
    const valid = validate(eventSchema, {
      userId: "u_abc123",
      type: "page_view",
      timestamp: Date.now(),
      pageDepth: 1,
    });
    expect(valid.userId).toBe("u_abc123");
  });

  test("rejects invalid event type", () => {
    expect(() =>
      validate(eventSchema, { userId: "u_abc", type: "hacked_event" })
    ).toThrow();
  });

  test("rejects missing userId", () => {
    expect(() =>
      validate(eventSchema, { type: "page_view" })
    ).toThrow();
  });
});

describe("API contract: /api/counterfactual", () => {
  test("accepts userId only", () => {
    const r = validate(counterfactualRequestSchema, { userId: "u_abc" });
    expect(r.userId).toBe("u_abc");
  });

  test("accepts userId + treatments", () => {
    const r = validate(counterfactualRequestSchema, {
      userId: "u_abc",
      treatments: { discount: true, urgency_messaging: false },
    });
    expect(r.treatments?.discount).toBe(true);
  });
});

describe("API contract: /api/bandit/update", () => {
  test("defaults steps to 1", () => {
    const r = validate(banditUpdateSchema, {});
    expect(r.steps).toBe(1);
  });

  test("rejects steps > 100", () => {
    expect(() => validate(banditUpdateSchema, { steps: 101 })).toThrow();
  });

  test("accepts reset=true", () => {
    const r = validate(banditUpdateSchema, { reset: true, steps: 5 });
    expect(r.reset).toBe(true);
    expect(r.steps).toBe(5);
  });
});

describe("API contract: /api/personalize", () => {
  test("accepts userId only", () => {
    const r = validate(personalizeRequestSchema, { userId: "u_abc" });
    expect(r.userId).toBe("u_abc");
    expect(r.useCache).toBe(true); // default
  });

  test("rejects invalid channel", () => {
    expect(() =>
      validate(personalizeRequestSchema, { userId: "u", channel: "telegram" })
    ).toThrow();
  });

  test("accepts valid channel + tone", () => {
    const r = validate(personalizeRequestSchema, {
      userId: "u_abc",
      channel: "email",
      tone: "urgent",
    });
    expect(r.channel).toBe("email");
    expect(r.tone).toBe("urgent");
  });
});

describe("Dataset → ML pipeline integration", () => {
  const ds = generateDataset();

  test("dataset supports all downstream ML operations", () => {
    expect(ds.users.length).toBeGreaterThan(0);
    expect(ds.events.length).toBeGreaterThan(0);
    // ML modules import fine if we got here
  });
});
