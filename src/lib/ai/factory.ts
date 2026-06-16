// ============================================================
// PersonaForge — AI Provider Factory + Cache
// ============================================================
// Builds the provider chain (Claude → Gemini → OpenAI → Template),
// memoizes the chain, and caches results in Redis/memory.
// ============================================================

import { ClaudeProvider } from "./providers/claude";
import { GeminiProvider } from "./providers/gemini";
import { OpenAIProvider } from "./providers/openai";
import { TemplateProvider } from "./providers/template";
import { ContentProvider, ProviderChain } from "./provider";
import { cache } from "@/lib/cache/redis";

let chain: ProviderChain | null = null;

export function getProviderChain(): ProviderChain {
  if (chain) return chain;
  const providers: ContentProvider[] = [
    new ClaudeProvider(),
    new GeminiProvider(),
    new OpenAIProvider(),
    new TemplateProvider(), // always-available fallback
  ];
  chain = new ProviderChain(providers);
  return chain;
}

export async function getActiveProviderName(): Promise<string> {
  const c = getProviderChain();
  const p = await c.getActiveProvider();
  return p.name;
}

// Cache wrapper — caches personalization output by user+persona key
export async function generatePersonalizedContentCached(
  user: { id: string },
  persona: { kind: string },
  request: Parameters<ProviderChain["generatePersonalizedContent"]>[0]
) {
  const cacheKey = `persona:content:${user.id}:${persona.kind}`;
  const cached = await cache.get<ReturnType<ProviderChain["generatePersonalizedContent"]>>(cacheKey);
  if (cached) {
    return { ...(await cached), cached: true };
  }
  const chain = getProviderChain();
  const result = await chain.generatePersonalizedContent(request);
  // Cache for 10 minutes
  await cache.set(cacheKey, result, 600);
  return result;
}

export async function generateExplanationCached(
  user: { id: string },
  persona: { kind: string },
  request: Parameters<ProviderChain["generateExplanation"]>[0]
) {
  const cacheKey = `persona:explanation:${user.id}:${persona.kind}`;
  const cached = await cache.get<ReturnType<ProviderChain["generateExplanation"]>>(cacheKey);
  if (cached) {
    return { ...(await cached), cached: true };
  }
  const chain = getProviderChain();
  const result = await chain.generateExplanation(request);
  await cache.set(cacheKey, result, 600);
  return result;
}

export type {
  ContentProvider,
  PersonalizationRequest,
  PersonalizationResult,
  ExplanationRequest,
  ExplanationResult,
} from "./provider";
