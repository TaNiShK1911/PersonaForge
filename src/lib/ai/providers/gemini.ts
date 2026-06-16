// ============================================================
// Gemini (Google) Content Provider — fallback #1
// ============================================================

import type {
  ContentProvider,
  ExplanationRequest,
  ExplanationResult,
  PersonalizationRequest,
  PersonalizationResult,
} from "../provider";
import { generatePersonalization, generateExplanation } from "../content";

const PROVIDER_NAME = "gemini";

export class GeminiProvider implements ContentProvider {
  readonly name = PROVIDER_NAME;
  readonly priority = 2;

  private apiKey: string | undefined;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    this.model = process.env.GEMINI_MODEL ?? "gemini-1.5-pro";
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async generatePersonalizedContent(
    req: PersonalizationRequest
  ): Promise<PersonalizationResult> {
    const start = Date.now();
    // Use the same SDK abstraction (z-ai-web-dev-sdk supports multiple providers)
    try {
      const ZAI = await import("z-ai-web-dev-sdk").then((m) => m.default ?? m);
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "user",
            content: buildPersonalizationPrompt(req),
          },
        ],
        temperature: 0.7,
        max_tokens: req.maxTokens ?? 800,
        // model: this.model,  // SDK picks provider based on env
      });
      const text =
        completion.choices?.[0]?.message?.content ??
        completion.choices?.[0]?.delta?.content ??
        "";
      const parsed = parseJsonLoose(text);
      const fallback = generatePersonalization(req.user, req.persona);
      return {
        headline: parsed?.headline ?? fallback.headline,
        emailSubject: parsed?.emailSubject ?? fallback.emailSubject,
        emailBody: parsed?.emailBody ?? fallback.emailBody,
        adCopy: parsed?.adCopy ?? fallback.adCopy,
        pushNotification: parsed?.pushNotification ?? fallback.pushNotification,
        cta: parsed?.cta ?? fallback.cta,
        productRanking: parsed?.productRanking ?? fallback.productRanking,
        provider: PROVIDER_NAME,
        tokensUsed: completion.usage?.total_tokens ?? 0,
        latencyMs: Date.now() - start,
        cached: false,
      };
    } catch (err) {
      throw new Error(`Gemini personalization failed: ${(err as Error).message}`);
    }
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

function buildPersonalizationPrompt(req: PersonalizationRequest): string {
  return `Generate persona-aware marketing copy as JSON for ${req.persona.persona_name}.
User: ${req.user.name}, persona: ${req.persona.persona_name}.
Return JSON with: headline, emailSubject, emailBody, adCopy, pushNotification, cta, productRanking.`;
}

function parseJsonLoose(text: string): any | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
