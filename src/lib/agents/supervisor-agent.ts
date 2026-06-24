// ============================================================
// PersonaForge — Supervisor Agent
// ============================================================
// Orchestrates the full agent chain in the canonical order:
//   Supervisor → PersonaClassifier → ContentGenerator →
//   BanditOptimizer → Insight → Counterfactual
// Controls the run, collects outputs, and writes the final
// synthesis back into PersonaForge.
// ============================================================

import { BaseAgent } from "./base-agent";
import { AgentState, createInitialState, AGENT_CHAIN_ORDER } from "./types";
import { PersonaClassifierAgent } from "./persona-classifier-agent";
import { ContentGeneratorAgent } from "./content-generator-agent";
import { BanditOptimizerAgent } from "./bandit-optimizer-agent";
import { InsightAgent } from "./insight-agent";
import { CounterfactualAgent } from "./counterfactual-agent";
import { db } from "@/lib/db";

export class SupervisorAgent extends BaseAgent {
  readonly name = "SupervisorAgent";
  readonly description = "Orchestrates the full agent chain and writes final synthesis";

  private subAgents = [
    new PersonaClassifierAgent(),
    new ContentGeneratorAgent(),
    new BanditOptimizerAgent(),
    new InsightAgent(),
    new CounterfactualAgent(),
  ];

  protected async execute(state: AgentState): Promise<AgentState> {
    // Run each sub-agent in sequence, passing the shared state
    for (const agent of this.subAgents) {
      state = await agent.run(state);
    }

    // Build final synthesis
    state.finalRecommendation = this.buildSynthesis(state);

    return state;
  }

  /**
   * Build the final synthesized recommendation from all agent outputs.
   */
  private buildSynthesis(state: AgentState): string {
    const sections: string[] = [];

    sections.push("# 🧠 PersonaForge Agent Analysis Report\n");

    // Persona classification
    if (state.personaProfile) {
      sections.push(`## 👤 Persona Classification`);
      sections.push(`- **Persona:** ${state.personaProfile.name} (\`${state.personaProfile.kind}\`)`);
      sections.push(`- **Confidence:** ${(state.personaProfile.confidence * 100).toFixed(0)}%`);
      if (state.personaProfile.traits.length > 0) {
        sections.push(`- **Traits:** ${state.personaProfile.traits.join(", ")}`);
      }
      if (state.personaProfile.topFeatures.length > 0) {
        sections.push(`- **Top Features:**`);
        for (const f of state.personaProfile.topFeatures.slice(0, 3)) {
          sections.push(`  - ${f.feature}: ${(f.value * 100).toFixed(0)}%`);
        }
      }
      sections.push("");
    }

    // Treatment selection
    if (state.treatmentChoice) {
      sections.push(`## 🎯 Treatment Selection`);
      sections.push(`- **Selected Arm:** ${state.treatmentChoice.label}`);
      sections.push(`- **Confidence:** ${(state.treatmentChoice.confidence * 100).toFixed(0)}%`);
      sections.push(`- **Reason:** ${state.treatmentChoice.reason}`);
      sections.push("");
    }

    // Generated content
    if (state.generatedContent) {
      sections.push(`## ✍️ Generated Content`);
      sections.push(`- **Headline:** ${state.generatedContent.headline}`);
      sections.push(`- **Email Subject:** ${state.generatedContent.emailSubject}`);
      sections.push(`- **Ad Copy:** ${state.generatedContent.adCopy}`);
      sections.push(`- **Push:** ${state.generatedContent.pushNotification}`);
      sections.push(`- **CTA:** ${state.generatedContent.cta}`);
      sections.push("");
    }

    // Counterfactual
    if (state.counterfactualResult) {
      sections.push(`## 🔮 Counterfactual Analysis`);
      sections.push(`- **Baseline Conversion:** ${(state.counterfactualResult.baseline * 100).toFixed(1)}%`);
      sections.push(`- **Predicted Conversion:** ${(state.counterfactualResult.predicted * 100).toFixed(1)}%`);
      sections.push(`- **Expected Uplift:** +${state.counterfactualResult.uplift.toFixed(1)}%`);
      sections.push(`- **Scenario:** ${state.counterfactualResult.scenario}`);
      sections.push("");
    }

    // Insights
    if (state.insights) {
      sections.push(`## 💡 Key Insights`);
      for (const finding of state.insights.keyFindings) {
        sections.push(`- ${finding}`);
      }
      sections.push("");
      sections.push(`## 📋 Recommendations`);
      for (const rec of state.insights.recommendations) {
        sections.push(`- ${rec}`);
      }
      sections.push("");
    }

    // Agent chain trace
    sections.push(`## ⚙️ Agent Chain Execution`);
    for (const entry of state.trace) {
      const icon = entry.status === "success" ? "✅" : entry.status === "error" ? "❌" : "⏭️";
      sections.push(`${icon} **${entry.agentName}** — ${entry.durationMs}ms — ${entry.output ?? entry.error ?? "completed"}`);
    }

    // Errors
    if (state.errors.length > 0) {
      sections.push(`\n## ⚠️ Errors`);
      for (const err of state.errors) {
        sections.push(`- ${err}`);
      }
    }

    return sections.join("\n");
  }

  protected summarizeOutput(state: AgentState): string {
    const successCount = state.trace.filter((t) => t.status === "success").length;
    const totalDuration = state.trace.reduce((sum, t) => sum + t.durationMs, 0);
    return `Chain completed: ${successCount}/${state.trace.length - 1} agents succeeded in ${totalDuration}ms`;
  }
}

/**
 * Run a full agent analysis and persist the result.
 */
export async function runAgentAnalysis(input: {
  userId?: string;
  question?: string;
  goal?: string;
  conversationId?: string;
  triggeredBy: string;
}): Promise<{
  runId: string;
  state: AgentState;
}> {
  const startTime = Date.now();

  // Create the AgentRun record
  const agentRun = await db.agentRun.create({
    data: {
      conversationId: input.conversationId,
      triggeredBy: input.triggeredBy,
      status: "running",
      input: JSON.stringify({
        userId: input.userId,
        question: input.question,
        goal: input.goal,
      }),
      agentsUsed: AGENT_CHAIN_ORDER.join(","),
    },
  });

  try {
    // Initialize state and run the supervisor
    const initialState = createInitialState({
      userId: input.userId,
      question: input.question,
      goal: input.goal,
    });

    const supervisor = new SupervisorAgent();
    const finalState = await supervisor.run(initialState);

    const totalDuration = Date.now() - startTime;

    // Update the run record with results
    await db.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: finalState.errors.length > 0 ? "completed_with_errors" : "completed",
        output: finalState.finalRecommendation,
        trace: JSON.stringify(finalState.trace),
        totalTokens: finalState.totalTokens,
        latencyMs: totalDuration,
      },
    });

    return { runId: agentRun.id, state: finalState };
  } catch (err) {
    // Mark as failed
    await db.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: "failed",
        output: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - startTime,
      },
    });
    throw err;
  }
}
