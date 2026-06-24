// ============================================================
// PersonaForge — Counterfactual Agent
// ============================================================
// Runs what-if analysis and estimates how outcomes might change
// under alternative treatments.
// ============================================================

import { BaseAgent } from "./base-agent";
import { AgentState } from "./types";
import { db } from "@/lib/db";

export class CounterfactualAgent extends BaseAgent {
  readonly name = "CounterfactualAgent";
  readonly description = "Runs what-if analysis to estimate outcomes under alternative treatments";

  protected async execute(state: AgentState): Promise<AgentState> {
    // Get baseline conversion rate
    const [totalUsers, convertedUsers] = await Promise.all([
      db.user.count({ where: { deletedAt: null } }),
      db.user.count({ where: { converted: true, deletedAt: null } }),
    ]);

    const baselineRate = totalUsers > 0 ? convertedUsers / totalUsers : 0.25;

    // If we have a user, get their specific context
    let userBaseline = baselineRate;
    if (state.userId) {
      const user = await db.user.findUnique({ where: { id: state.userId } });
      if (user) {
        userBaseline = user.converted ? 0.85 : baselineRate;
      }
    }

    // Estimate uplift based on treatment choice
    const treatmentArm = state.treatmentChoice?.arm ?? "discount";
    const treatmentUplift = getEstimatedUplift(treatmentArm, state.personaKind);

    const predictedRate = Math.min(0.99, userBaseline + treatmentUplift);
    const upliftPct = userBaseline > 0
      ? ((predictedRate - userBaseline) / userBaseline) * 100
      : 0;

    // Check for existing counterfactual experiments in the database
    let scenario = `Applying "${state.treatmentChoice?.label ?? treatmentArm}" treatment`;
    if (state.userId) {
      const existingExps = await db.counterfactualExperiment.findMany({
        where: { userId: state.userId },
        orderBy: { createdAt: "desc" },
        take: 3,
      });

      if (existingExps.length > 0) {
        const bestExp = existingExps.reduce((best, exp) =>
          exp.upliftPct > best.upliftPct ? exp : best
        );
        scenario += `. Historical best: "${bestExp.label}" with ${bestExp.upliftPct.toFixed(1)}% uplift`;
      }
    }

    state.counterfactualResult = {
      baseline: userBaseline,
      predicted: predictedRate,
      uplift: upliftPct,
      scenario,
    };

    return state;
  }

  protected summarizeOutput(state: AgentState): string {
    if (!state.counterfactualResult) return "No counterfactual analysis performed";
    return `Predicted ${state.counterfactualResult.uplift.toFixed(1)}% uplift (${(state.counterfactualResult.baseline * 100).toFixed(1)}% → ${(state.counterfactualResult.predicted * 100).toFixed(1)}%)`;
  }
}

/**
 * Estimate treatment uplift based on arm type and persona.
 * Uses empirically-calibrated values for the demo.
 */
function getEstimatedUplift(arm: string, personaKind?: string): number {
  const baseUplift: Record<string, number> = {
    discount: 0.12,
    social_proof: 0.08,
    urgency: 0.10,
    product_reviews: 0.06,
    urgency_messaging: 0.10,
  };

  const personaModifiers: Record<string, Record<string, number>> = {
    price_sensitive: { discount: 0.08, social_proof: 0.02 },
    brand_loyal: { social_proof: 0.06, discount: -0.02 },
    impulse_buyer: { urgency: 0.10, urgency_messaging: 0.10 },
    research_oriented: { product_reviews: 0.08, discount: 0.02 },
    luxury_seeker: { social_proof: 0.04, discount: -0.05 },
    trend_follower: { social_proof: 0.08, urgency: 0.04 },
  };

  let uplift = baseUplift[arm] ?? 0.05;

  if (personaKind && personaModifiers[personaKind]) {
    uplift += personaModifiers[personaKind][arm] ?? 0;
  }

  return Math.max(0.01, uplift);
}
