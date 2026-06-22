// ============================================================
// /api/personalize — Generate personalized content (HARD DB)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  fetchUserWithEvents,
  fetchPersonas,
  DatabaseUnavailableError,
} from "@/lib/db/hard-queries";
import {
  validate,
  personalizeRequestSchema,
  ValidationError,
} from "@/lib/security/validation";
import { rateLimiters, getClientIp } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";
import { generatePersonalizedContentCached } from "@/lib/ai/factory";
import { PERSONA_META, type Persona } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const auth = await requirePermission("personalization:write");
    if (auth instanceof NextResponse) return auth;

    const ip = getClientIp(req);
    const rl = await rateLimiters.ai(auth.session.user.id ?? ip);
    if (!rl.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Rate limited (AI tier)" },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
        )
      );
    }

    const body = await req.json();
    const { userId, channel, tone, useCache } = validate(
      personalizeRequestSchema,
      body
    );

    // HARD DB: fetch user
    const userData = await fetchUserWithEvents(userId);
    if (!userData) {
      return applySecurityHeaders(
        NextResponse.json({ error: "User not found" }, { status: 404 })
      );
    }

    // HARD DB: fetch personas
    const personas = await fetchPersonas();
    const personaRow =
      personas.find((p) => p.kind === userData.user.personaKind) ?? personas[0];
    if (!personaRow) {
      return applySecurityHeaders(
        NextResponse.json({ error: "No personas seeded" }, { status: 500 })
      );
    }

    // Convert DB persona row to the Persona shape used by the AI factory
    const meta = PERSONA_META[personaRow.kind as keyof typeof PERSONA_META] ?? {
      name: personaRow.name,
      tagline: personaRow.tagline ?? "",
      color: personaRow.color ?? "#a78bfa",
      emoji: personaRow.emoji ?? "",
    };
    const persona: Persona = {
      persona_name: personaRow.name,
      kind: personaRow.kind as any,
      traits: Array.isArray(personaRow.traits) ? personaRow.traits : [],
      behavior_embedding: {
        x: personaRow.embedding?.[0] ?? 0.5,
        y: personaRow.embedding?.[1] ?? 0.5,
      },
      confidence: personaRow.confidence,
      memberCount: personaRow.memberCount,
      avgConversion: personaRow.avgConversion,
      avgRevenue: personaRow.avgRevenue,
      topFeatures: Array.isArray(personaRow.topFeatures)
        ? personaRow.topFeatures
        : [],
    };

    const user = {
      id: userData.user.id,
      name: userData.user.name ?? "",
      email: userData.user.email ?? "",
      persona: (userData.user.personaKind as any) ?? "price_sensitive",
      createdAt: Date.now(),
      features: userData.user.features,
      events: [],
      converted: userData.user.converted,
      revenue: userData.user.revenue,
      sessions: userData.user.sessions,
    };

    const result = useCache
      ? await generatePersonalizedContentCached(user, persona, {
          user: user as any,
          persona,
          causalEffects: [], // Would load from causal_effects table in full prod
          channel: channel ?? "email",
          tone: tone ?? "professional",
        })
      : await generatePersonalizedContentCached(user, persona, {
          user: user as any,
          persona,
          causalEffects: [],
          channel: channel ?? "email",
          tone: tone ?? "professional",
        });

    metrics.increment("api_personalizations_total");
    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);
    if (result && typeof result === "object" && "latencyMs" in result) {
      metrics.observe(
        "ai_provider_latency_ms",
        (result as { latencyMs: number }).latencyMs
      );
    }

    return applySecurityHeaders(NextResponse.json(result));
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("POST /api/personalize failed", {}, err as Error);
    if (err instanceof ValidationError) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Validation failed", issues: err.fieldErrors },
          { status: 400 }
        )
      );
    }
    if (err instanceof DatabaseUnavailableError) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Database unavailable", message: err.message },
          { status: 503 }
        )
      );
    }
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
