// ============================================================
// PersonaForge — AI Content Provider Interface
// ============================================================
// All providers implement this interface. The factory picks the
// first available provider in priority order:
//   1. Claude (Anthropic)
//   2. Gemini (Google)
//   3. OpenAI
//   4. Template engine (deterministic fallback, always available)
// ============================================================

import type { Persona, User } from "@/lib/types";
import type { CausalEffect } from "@/lib/types";

export interface PersonalizationRequest {
  user: User;
  persona: Persona;
  causalEffects: CausalEffect[];
  channel: "email" | "ad" | "push" | "headline";
  tone?: "professional" | "casual" | "persuasive" | "urgent";
  maxTokens?: number;
}

export interface ExplanationRequest {
  user: User;
  persona: Persona;
  causalEffects: CausalEffect[];
  recommendation: string;
  counterfactualNote: string;
}

export interface PersonalizationResult {
  headline: string;
  emailSubject: string;
  emailBody: string;
  adCopy: string;
  pushNotification: string;
  cta: string;
  productRanking: { productId: string; score: number; reason: string }[];
  provider: string;
  tokensUsed: number;
  latencyMs: number;
  cached: boolean;
}

export interface ExplanationResult {
  fullText: string;
  personaDriver: string;
  causalDrivers: { factor: string; impact: number }[];
  counterfactualNote: string;
  similarCampaignUplift: number;
  confidence: number;
  provider: string;
  tokensUsed: number;
  latencyMs: number;
  cached: boolean;
}

export interface ContentProvider {
  readonly name: string;
  readonly priority: number;
  isAvailable(): Promise<boolean>;
  generatePersonalizedContent(
    req: PersonalizationRequest
  ): Promise<PersonalizationResult>;
  generateExplanation(req: ExplanationRequest): Promise<ExplanationResult>;
}

// ---------- Provider chain executor ----------

export class ProviderChain {
  constructor(private providers: ContentProvider[]) {
    // sort by priority (1 = highest)
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  async getActiveProvider(): Promise<ContentProvider> {
    for (const p of this.providers) {
      try {
        if (await p.isAvailable()) return p;
      } catch (err) {
        console.warn(`[provider-chain] ${p.name} availability check failed`, err);
      }
    }
    // Should never happen since template provider is always available
    throw new Error("No content provider available");
  }

  async generatePersonalizedContent(
    req: PersonalizationRequest
  ): Promise<PersonalizationResult> {
    const errors: Error[] = [];
    for (const p of this.providers) {
      try {
        if (!(await p.isAvailable())) continue;
        return await withTimeout(
          p.generatePersonalizedContent(req),
          getTimeout(p.name),
          `${p.name}.generatePersonalizedContent`
        );
      } catch (err) {
        errors.push(err as Error);
        console.warn(
          `[provider-chain] ${p.name} personalization failed:`,
          (err as Error).message
        );
        // try next provider
      }
    }
    throw new Error(
      `All providers failed. Errors: ${errors.map((e) => e.message).join(" | ")}`
    );
  }

  async generateExplanation(
    req: ExplanationRequest
  ): Promise<ExplanationResult> {
    const errors: Error[] = [];
    for (const p of this.providers) {
      try {
        if (!(await p.isAvailable())) continue;
        return await withTimeout(
          p.generateExplanation(req),
          getTimeout(p.name),
          `${p.name}.generateExplanation`
        );
      } catch (err) {
        errors.push(err as Error);
        console.warn(
          `[provider-chain] ${p.name} explanation failed:`,
          (err as Error).message
        );
      }
    }
    throw new Error(
      `All providers failed. Errors: ${errors.map((e) => e.message).join(" | ")}`
    );
  }
}

function getTimeout(providerName: string): number {
  // LLM providers get longer timeouts; template is near-instant
  if (providerName === "template") return 1000;
  return Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 12000);
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}
