// ============================================================
// PersonaForge — Consent Gate Tests
// ============================================================

import { describe, test, expect } from "bun:test";
import {
  applyConsentGate,
  explainConsentLimitations,
  hasConsent,
  getConsentCapabilities,
  type ConsentLevel,
} from "@/lib/consent/gate";

describe("Consent Gate", () => {
  test("none consent blocks all personalization", () => {
    const user = { id: "user1", consentLevel: "none" as ConsentLevel };
    const result = applyConsentGate(user, [
      "individual_causal_targeting",
      "cross_device_identity_resolution",
      "ai_content_generation",
    ]);

    expect(result.consentLevel).toBe("none");
    expect(result.allowed.length).toBe(0);
    expect(result.denied.length).toBe(3);
    expect(result.fallbackStrategy).toBe("contextual_only");
  });

  test("basic consent allows persona targeting but not individual", () => {
    const user = { id: "user1", consentLevel: "basic" as ConsentLevel };
    const result = applyConsentGate(user, [
      "persona_targeting",
      "product_recommendations",
      "individual_causal_targeting",
      "cross_device_identity_resolution",
    ]);

    expect(result.allowed).toContain("persona_targeting");
    expect(result.allowed).toContain("product_recommendations");
    expect(result.denied).toContain("individual_causal_targeting");
    expect(result.denied).toContain("cross_device_identity_resolution");
  });

  test("full consent allows everything", () => {
    const user = { id: "user1", consentLevel: "full" as ConsentLevel };
    const result = applyConsentGate(user, [
      "persona_targeting",
      "individual_causal_targeting",
      "cross_device_identity_resolution",
      "ai_content_generation",
    ]);

    expect(result.allowed.length).toBe(4);
    expect(result.denied.length).toBe(0);
    expect(result.fallbackStrategy).toBe("full_personalization");
  });

  test("hasConsent helper", () => {
    const noneUser = { id: "u1", consentLevel: "none" as ConsentLevel };
    const basicUser = { id: "u2", consentLevel: "basic" as ConsentLevel };
    const fullUser = { id: "u3", consentLevel: "full" as ConsentLevel };

    expect(hasConsent(noneUser, "persona_targeting")).toBe(false);
    expect(hasConsent(basicUser, "persona_targeting")).toBe(true);
    expect(hasConsent(basicUser, "individual_causal_targeting")).toBe(false);
    expect(hasConsent(fullUser, "individual_causal_targeting")).toBe(true);
  });

  test("explainConsentLimitations", () => {
    const noneUser = { id: "u1", consentLevel: "none" as ConsentLevel };
    const basicUser = { id: "u2", consentLevel: "basic" as ConsentLevel };

    const noneExplanation = explainConsentLimitations(noneUser, [
      "persona_targeting",
    ]);
    expect(noneExplanation).toContain("none");
    expect(noneExplanation).toContain("contextual");

    const basicExplanation = explainConsentLimitations(basicUser, [
      "individual_causal_targeting",
    ]);
    expect(basicExplanation).toContain("basic");
    expect(basicExplanation).toContain("persona-level");
  });

  test("getConsentCapabilities", () => {
    const noneCapabilities = getConsentCapabilities("none");
    const basicCapabilities = getConsentCapabilities("basic");
    const fullCapabilities = getConsentCapabilities("full");

    expect(noneCapabilities.length).toBeLessThan(basicCapabilities.length);
    expect(basicCapabilities.length).toBeLessThan(fullCapabilities.length);

    expect(fullCapabilities).toContain("individual_causal_targeting");
    expect(fullCapabilities).toContain("cross_device_identity_resolution");
  });

  test("default consent level is full when not specified", () => {
    const user = { id: "user1" };
    const result = applyConsentGate(user, ["individual_causal_targeting"]);

    expect(result.consentLevel).toBe("full");
    expect(result.allowed).toContain("individual_causal_targeting");
  });
});
