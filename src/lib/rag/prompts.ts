// ============================================================
// PersonaForge — RAG Prompt Templates
// ============================================================
// System and user prompt templates for the RAG chatbot.
// Grounded in live PersonaForge data context.
// ============================================================

export const SYSTEM_PROMPT = `You are the PersonaForge AI Copilot — an expert marketing intelligence assistant embedded inside the PersonaForge hyper-personalization platform.

Your purpose is to help marketers understand their users, personas, campaign performance, and make data-driven decisions using live platform data.

You have access to the following PersonaForge data:
- User profiles with behavioral features (price sensitivity, brand affinity, urgency response, etc.)
- Micro-persona clusters (Bargain Hunter, Brand Loyalist, Impulse Buyer, Deep Researcher, Luxury Seeker, Trend Follower)
- Causal analysis results (treatment effects of discounts, social proof, reviews, urgency messaging)
- Counterfactual experiments (what-if scenario results)
- Multi-armed bandit optimization state (Thompson Sampling)
- Generated content examples (emails, ads, push notifications)
- Analytics snapshots (conversion rates, revenue, user activity)

When answering questions:
1. Ground your responses in the provided context data — cite specific numbers and findings
2. Be concise and actionable — marketers want insights they can act on immediately
3. When relevant, suggest running the agentic analysis system for deeper insights
4. Use persona names (e.g., "Bargain Hunter") rather than internal IDs
5. Format responses with clear sections, bullet points, and highlights
6. If the question implies an action (e.g., "run analysis", "generate campaign"), suggest the agentic system

If the provided context doesn't contain enough information to answer confidently, say so clearly and suggest what data might help.`;

export function buildUserPrompt(
  question: string,
  context: string,
  liveStats?: {
    totalUsers?: number;
    convertedUsers?: number;
    conversionRate?: number;
    revenue?: number;
    topPersona?: string;
  }
): string {
  let prompt = `## Retrieved Context\n${context}\n\n`;

  if (liveStats) {
    prompt += `## Live Platform Stats\n`;
    if (liveStats.totalUsers !== undefined) prompt += `- Total users: ${liveStats.totalUsers}\n`;
    if (liveStats.convertedUsers !== undefined) prompt += `- Converted users: ${liveStats.convertedUsers}\n`;
    if (liveStats.conversionRate !== undefined) prompt += `- Conversion rate: ${(liveStats.conversionRate * 100).toFixed(1)}%\n`;
    if (liveStats.revenue !== undefined) prompt += `- Total revenue: $${liveStats.revenue.toFixed(2)}\n`;
    if (liveStats.topPersona) prompt += `- Top performing persona: ${liveStats.topPersona}\n`;
    prompt += `\n`;
  }

  prompt += `## User Question\n${question}`;

  return prompt;
}

export const AGENT_ACTION_KEYWORDS = [
  "run",
  "analyze",
  "generate",
  "create campaign",
  "optimize",
  "classify",
  "what if",
  "counterfactual",
  "predict",
  "simulate",
  "recommend",
  "agent",
];

/**
 * Check if the user's question implies they want to trigger the agentic system.
 */
export function detectAgentIntent(question: string): boolean {
  const lower = question.toLowerCase();
  return AGENT_ACTION_KEYWORDS.some((kw) => lower.includes(kw));
}
