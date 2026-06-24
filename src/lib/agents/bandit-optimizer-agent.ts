// ============================================================
// PersonaForge — Bandit Optimizer Agent
// ============================================================
// Chooses the most promising treatment arm using bandit state
// and prior performance (Thompson Sampling).
// ============================================================

import { BaseAgent } from "./base-agent";
import { AgentState } from "./types";
import { db } from "@/lib/db";

export class BanditOptimizerAgent extends BaseAgent {
  readonly name = "BanditOptimizerAgent";
  readonly description = "Selects optimal treatment arm using Thompson Sampling bandit state";

  protected async execute(state: AgentState): Promise<AgentState> {
    // Fetch bandit variants from database
    const variants = await db.banditVariant.findMany({
      where: { isActive: true },
      orderBy: { observedRate: "desc" },
    });

    if (variants.length === 0) {
      // Fallback if no variants exist
      state.treatmentChoice = {
        arm: "discount",
        label: "Discount Message",
        confidence: 0.5,
        reason: "Default treatment (no bandit state available)",
      };
      return state;
    }

    // Thompson Sampling: sample from each arm's Beta posterior
    const samples = variants.map((v) => {
      const theta = sampleBeta(v.alpha, v.beta);
      return {
        variant: v,
        theta,
      };
    });

    // Choose arm with highest sampled value
    samples.sort((a, b) => b.theta - a.theta);
    const chosen = samples[0];

    // Calculate confidence based on posterior concentration
    const totalPulls = variants.reduce((sum, v) => sum + v.pulls, 0);
    const confidence = Math.min(0.99, chosen.variant.pulls / Math.max(1, totalPulls) + chosen.theta * 0.3);

    state.treatmentChoice = {
      arm: chosen.variant.armKey,
      label: chosen.variant.label,
      confidence,
      reason: `Thompson Sampling selected "${chosen.variant.label}" with θ=${chosen.theta.toFixed(3)} (observed rate: ${(chosen.variant.observedRate * 100).toFixed(1)}%, ${chosen.variant.pulls} pulls)`,
    };

    return state;
  }

  protected summarizeOutput(state: AgentState): string {
    return `Selected: ${state.treatmentChoice?.label ?? "unknown"} (confidence: ${((state.treatmentChoice?.confidence ?? 0) * 100).toFixed(0)}%)`;
  }
}

/**
 * Sample from a Beta(alpha, beta) distribution using the Joehnk method.
 */
function sampleBeta(alpha: number, beta: number): number {
  // Simple approximation using gamma samples
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  return x / (x + y);
}

function sampleGamma(shape: number): number {
  if (shape < 1) {
    return sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number;
    let v: number;
    do {
      x = randn();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function randn(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
