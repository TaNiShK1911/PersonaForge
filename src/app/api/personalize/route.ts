// ============================================================
// /api/personalize — Generate personalized content
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { useForgeStore } from "@/lib/store";
import { validate, personalizeRequestSchema, ValidationError } from "@/lib/security/validation";
import { rateLimiters, getClientIp } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";
import { generatePersonalizedContentCached } from "@/lib/ai/factory";

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
        NextResponse.json({ error: "Rate limited (AI tier)" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } })
      );
    }

    const body = await req.json();
    const { userId, channel, tone, useCache } = validate(personalizeRequestSchema, body);

    const store = useForgeStore.getState();
    const user = store.dataset.users.find((u) => u.id === userId);
    if (!user) {
      return applySecurityHeaders(
        NextResponse.json({ error: "User not found" }, { status: 404 })
      );
    }
    const persona = store.personas.find((p) => p.kind === user.persona) ?? store.personas[0];
    if (!persona) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Persona not found" }, { status: 404 })
      );
    }

    const result = useCache
      ? await generatePersonalizedContentCached(user, persona, {
          user,
          persona,
          causalEffects: store.causalEffects,
          channel: channel ?? "email",
          tone: tone ?? "professional",
        })
      : await useForgeStore.getState().getPersonalization(user.id);

    metrics.increment("api_personalizations_total");
    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);
    if (result && typeof result === "object" && "latencyMs" in result) {
      metrics.observe("ai_provider_latency_ms", (result as { latencyMs: number }).latencyMs);
    }

    return applySecurityHeaders(NextResponse.json(result));
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("POST /api/personalize failed", {}, err as Error);
    if (err instanceof ValidationError) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Validation failed", issues: err.fieldErrors }, { status: 400 })
      );
    }
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
