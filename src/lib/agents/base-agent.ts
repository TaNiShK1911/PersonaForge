// ============================================================
// PersonaForge — Base Agent
// ============================================================
// Abstract base class for all agents in the orchestration chain.
// Each agent receives the shared state, updates it, and adds
// a trace entry for observability.
// ============================================================

import { AgentState, AgentTraceEntry } from "./types";

export abstract class BaseAgent {
  abstract readonly name: string;
  abstract readonly description: string;

  /**
   * Execute the agent's logic, updating the shared state.
   * Subclasses override this with their specific behavior.
   */
  protected abstract execute(state: AgentState): Promise<AgentState>;

  /**
   * Run the agent with automatic tracing and error handling.
   */
  async run(state: AgentState): Promise<AgentState> {
    const startedAt = Date.now();

    try {
      const updatedState = await this.execute(state);
      const completedAt = Date.now();

      const traceEntry: AgentTraceEntry = {
        agentName: this.name,
        startedAt,
        completedAt,
        durationMs: completedAt - startedAt,
        tokensUsed: 0, // Subclasses can override via state
        status: "success",
        output: this.summarizeOutput(updatedState),
      };

      updatedState.trace.push(traceEntry);
      return updatedState;
    } catch (err) {
      const completedAt = Date.now();
      const error = err instanceof Error ? err.message : String(err);

      const traceEntry: AgentTraceEntry = {
        agentName: this.name,
        startedAt,
        completedAt,
        durationMs: completedAt - startedAt,
        tokensUsed: 0,
        status: "error",
        error,
      };

      state.trace.push(traceEntry);
      state.errors.push(`${this.name}: ${error}`);

      console.error(`[agent/${this.name}] Error:`, err);
      return state;
    }
  }

  /**
   * Produce a short summary of what this agent outputted.
   * Override in subclasses for meaningful summaries.
   */
  protected summarizeOutput(_state: AgentState): string {
    return `${this.name} completed`;
  }
}
