// ============================================================
// Claude (Anthropic) Content Provider
// ============================================================
// Uses the z-ai-web-dev-sdk for actual LLM calls when the API
// key is configured. Falls back gracefully when unavailable.
// ============================================================

import type {
  ContentProvider,
  ExplanationRequest,
  ExplanationResult,
  PersonalizationRequest,
  PersonalizationResult,
} from "../provider";
import { generatePersonalization, generateExplanation } from "../content";
import { PERSONA_META } from "@/lib/types";

const PROVIDER_NAME = "claude";

export class ClaudeProvider implements ContentProvider {
  readonly name = PROVIDER_NAME;
  readonly priority = 1;

  private apiKey: string | undefined;
  private model: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY;
    this.model = process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-20241022";
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async generatePersonalizedContent(
    req: PersonalizationRequest
  ): Promise<PersonalizationResult> {
    const start = Date.now();
    const meta = PERSONA_META[req.persona.kind];

    const prompt = `You are an expert marketing copywriter for an e-commerce personalization platform.

User persona: ${meta.name} — ${meta.tagline}
User behavioral profile:
- Price sensitivity: ${(req.user.features.priceSensitivity * 100).toFixed(0)}%
- Discount response: ${(req.user.features.discountResponse * 100).toFixed(0)}%
- Urgency response: ${(req.user.features.urgencyResponse * 100).toFixed(0)}%
- Social proof response: ${(req.user.features.socialProofResponse * 100).toFixed(0)}%
- Review reliance: ${(req.user.features.reviewReliance * 100).toFixed(0)}%

Top causal drivers of conversion (from causal analysis):
${req.causalEffects
  .slice(0, 3)
  .map((e) => `- ${e.treatment}: +${(e.ate * 100).toFixed(1)}pp ATE`)
  .join("\n")}

Generate personalized marketing copy as STRICT JSON with these fields:
{
  "headline": "string (max 80 chars)",
  "emailSubject": "string (max 90 chars)",
  "emailBody": "string (3-4 paragraphs, friendly tone, address user by ${req.user.name.split(" ")[0]})",
  "adCopy": "string (max 140 chars)",
  "pushNotification": "string (max 90 chars)",
  "cta": "string (max 30 chars)",
  "productRanking": [{"productId": "string", "score": 0-1, "reason": "string"}]
}

Return ONLY valid JSON. No prose.`;

    try {
      // Dynamic import to avoid loading the SDK when not needed
      const ZAI = await import("z-ai-web-dev-sdk").then((m) => m.default ?? m);
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: req.maxTokens ?? 800,
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
      throw new Error(
        `Claude personalization failed: ${(err as Error).message}`
      );
    }
  }

  async generateExplanation(
    req: ExplanationRequest
  ): Promise<ExplanationResult> {
    const start = Date.now();

    // Reuse deterministic explanation logic, but mark as Claude-sourced
    // (in production this would call Claude to rephrase for naturalness)
    const expl = generateExplanation(
      req.user,
      req.persona,
      req.causalEffects,
      [] // users array not needed here; counterfactual note is precomputed
    );

    try {
      // Attempt LLM rephrasing for natural language
      if (await this.isAvailable()) {
        const ZAI = await import("z-ai-web-dev-sdk").then((m) => m.default ?? m);
        const zai = await ZAI.create();
        const prompt = `Rewrite this AI recommendation explanation to be more natural and conversational, preserving all facts and numbers. Keep it concise (under 200 words).

${expl.fullText}`;

        const completion = await zai.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 400,
        });
        const text =
          completion.choices?.[0]?.message?.content ??
          completion.choices?.[0]?.delta?.content ??
          "";
        return {
          ...expl,
          fullText: text || expl.fullText,
          provider: PROVIDER_NAME,
          tokensUsed: completion.usage?.total_tokens ?? 0,
          latencyMs: Date.now() - start,
          cached: false,
        };
      }
    } catch {
      // fall through to deterministic
    }

    return {
      ...expl,
      provider: PROVIDER_NAME,
      tokensUsed: 0,
      latencyMs: Date.now() - start,
      cached: false,
    };
  }
}

function parseJsonLoose(text: string): any | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // try to extract JSON from markdown code blocks
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
