// ============================================================
// Groq Content Provider
// ============================================================

import type {
  ContentProvider,
  ExplanationRequest,
  ExplanationResult,
  PersonalizationRequest,
  PersonalizationResult,
} from "../provider";
import { generatePersonalization, generateExplanation } from "../content";

const PROVIDER_NAME = "groq";

export class GroqProvider implements ContentProvider {
  readonly name = PROVIDER_NAME;
  readonly priority = 2; // Arbitrary priority between Claude and OpenAI

  private apiKey: string | undefined;
  private model: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.model = process.env.GROQ_MODEL ?? "llama3-8b-8192";
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async generatePersonalizedContent(
    req: PersonalizationRequest
  ): Promise<PersonalizationResult> {
    const start = Date.now();
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "user",
              content: `Generate persona-aware marketing copy as JSON.
Persona: ${req.persona.persona_name} — traits: ${req.persona.traits.join(", ")}
User: ${req.user.name}
Return JSON: {headline, emailSubject, emailBody, adCopy, pushNotification, cta, productRanking:[{productId, score, reason}]}`,
            },
          ],
          temperature: 0.7,
          max_tokens: req.maxTokens ?? 800,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const completion = await response.json();
      const text = completion.choices?.[0]?.message?.content ?? "";
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
      throw new Error(`Groq personalization failed: ${(err as Error).message}`);
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
