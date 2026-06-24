// ============================================================
// PersonaForge — Persona Classifier Agent
// ============================================================
// Classifies the target user into the best-fitting persona
// using behavior, engagement, and profile signals.
// ============================================================

import { BaseAgent } from "./base-agent";
import { AgentState } from "./types";
import { db } from "@/lib/db";
import { PERSONA_META } from "@/lib/types";

export class PersonaClassifierAgent extends BaseAgent {
  readonly name = "PersonaClassifierAgent";
  readonly description = "Classifies user into best-fitting persona using behavioral signals";

  protected async execute(state: AgentState): Promise<AgentState> {
    if (!state.userId) {
      // No user target — use the question context to infer persona
      state.personaKind = "price_sensitive";
      state.personaProfile = {
        kind: "price_sensitive",
        name: "Bargain Hunter",
        confidence: 0.5,
        traits: ["price-sensitive", "deal-seeking"],
        topFeatures: [{ feature: "priceSensitivity", value: 0.8 }],
      };
      return state;
    }

    // Fetch user from database
    const user = await db.user.findUnique({
      where: { id: state.userId },
      include: { persona: true },
    });

    if (!user) {
      state.errors.push("PersonaClassifierAgent: User not found");
      return state;
    }

    const features = typeof user.features === "string"
      ? JSON.parse(user.features)
      : user.features;

    // Score each persona based on user features
    const scores: { kind: string; score: number }[] = [
      {
        kind: "price_sensitive",
        score: (features.priceSensitivity ?? 0) * 0.4 + (features.discountResponse ?? 0) * 0.6,
      },
      {
        kind: "brand_loyal",
        score: (features.brandAffinity ?? 0) * 0.7 + (1 - (features.priceSensitivity ?? 0)) * 0.3,
      },
      {
        kind: "impulse_buyer",
        score: (features.urgencyResponse ?? 0) * 0.5 + (features.addToCartCount ?? 0 > 5 ? 0.5 : 0.2),
      },
      {
        kind: "research_oriented",
        score: (features.reviewReliance ?? 0) * 0.5 + (features.avgSessionLength ?? 0 > 300 ? 0.5 : 0.2),
      },
      {
        kind: "luxury_seeker",
        score: (1 - (features.priceSensitivity ?? 0)) * 0.4 + (features.brandAffinity ?? 0) * 0.3 + 0.3,
      },
      {
        kind: "trend_follower",
        score: (features.trendAffinity ?? 0) * 0.6 + (features.socialProofResponse ?? 0) * 0.4,
      },
    ];

    scores.sort((a, b) => b.score - a.score);
    const bestMatch = scores[0];
    const personaKind = user.personaKind ?? bestMatch.kind;
    const meta = PERSONA_META[personaKind as keyof typeof PERSONA_META];

    // Build top features
    const featureEntries = Object.entries(features)
      .filter(([k]) => !["embeddingX", "embeddingY"].includes(k))
      .map(([k, v]) => ({ feature: k, value: v as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    state.personaKind = personaKind;
    state.personaProfile = {
      kind: personaKind,
      name: meta?.name ?? personaKind,
      confidence: Math.min(0.99, bestMatch.score),
      traits: meta?.tagline?.split(",").map((s: string) => s.trim()) ?? [],
      topFeatures: featureEntries,
    };

    return state;
  }

  protected summarizeOutput(state: AgentState): string {
    return `Classified as ${state.personaProfile?.name ?? "unknown"} (${((state.personaProfile?.confidence ?? 0) * 100).toFixed(0)}% confidence)`;
  }
}
