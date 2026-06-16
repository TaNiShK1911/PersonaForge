// ============================================================
// Template Content Provider — deterministic fallback (always available)
// ============================================================
// Delegates to the existing lib/ai/content.ts generators which
// produce persona-conditioned copy without any LLM call.
// ============================================================

import type {
  ContentProvider,
  ExplanationRequest,
  ExplanationResult,
  PersonalizationRequest,
  PersonalizationResult,
} from "../provider";
import { generatePersonalization, generateExplanation } from "../content";

const PROVIDER_NAME = "template";

export class TemplateProvider implements ContentProvider {
  readonly name = PROVIDER_NAME;
  readonly priority = 99; // always last

  async isAvailable(): Promise<boolean> {
    return true; // template engine is always available
  }

  async generatePersonalizedContent(
    req: PersonalizationRequest
  ): Promise<PersonalizationResult> {
    const start = Date.now();
    const out = generatePersonalization(req.user, req.persona);
    return {
      ...out,
      provider: PROVIDER_NAME,
      tokensUsed: 0,
      latencyMs: Date.now() - start,
      cached: false,
    };
  }

  async generateExplanation(
    req: ExplanationRequest
  ): Promise<ExplanationResult> {
    const start = Date.now();
    const expl = generateExplanation(
      req.user,
      req.persona,
      req.causalEffects,
      []
    );
    return {
      ...expl,
      provider: PROVIDER_NAME,
      tokensUsed: 0,
      latencyMs: Date.now() - start,
      cached: false,
    };
  }
}
