// ============================================================
// PersonaForge — Agent System Types
// ============================================================
// Shared types for the multi-agent orchestration system.
// Chain: Supervisor → PersonaClassifier → ContentGenerator →
//        BanditOptimizer → Insight → Counterfactual
// ============================================================

export interface AgentState {
  // Input context
  userId?: string;
  personaKind?: string;
  question?: string;
  goal?: string;

  // Accumulated outputs
  personaProfile?: {
    kind: string;
    name: string;
    confidence: number;
    traits: string[];
    topFeatures: { feature: string; value: number }[];
  };
  generatedContent?: {
    headline: string;
    emailSubject: string;
    emailBody: string;
    adCopy: string;
    pushNotification: string;
    cta: string;
  };
  treatmentChoice?: {
    arm: string;
    label: string;
    confidence: number;
    reason: string;
  };
  insights?: {
    summary: string;
    keyFindings: string[];
    recommendations: string[];
  };
  counterfactualResult?: {
    baseline: number;
    predicted: number;
    uplift: number;
    scenario: string;
  };

  // Final synthesis
  finalRecommendation?: string;

  // Trace
  trace: AgentTraceEntry[];
  totalTokens: number;
  errors: string[];
}

export interface AgentTraceEntry {
  agentName: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  tokensUsed: number;
  status: "success" | "error" | "skipped";
  output?: string;
  error?: string;
}

export interface AgentResult {
  state: AgentState;
  success: boolean;
}

export const AGENT_CHAIN_ORDER = [
  "SupervisorAgent",
  "PersonaClassifierAgent",
  "ContentGeneratorAgent",
  "BanditOptimizerAgent",
  "InsightAgent",
  "CounterfactualAgent",
] as const;

export type AgentName = (typeof AGENT_CHAIN_ORDER)[number];

export function createInitialState(input: {
  userId?: string;
  question?: string;
  goal?: string;
}): AgentState {
  return {
    userId: input.userId,
    question: input.question,
    goal: input.goal,
    trace: [],
    totalTokens: 0,
    errors: [],
  };
}
