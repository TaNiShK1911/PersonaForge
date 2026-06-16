// ============================================================
// /api/counterfactual — Run counterfactual scenarios
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { useForgeStore } from "@/lib/store";
import { validate, counterfactualRequestSchema, ValidationError } from "@/lib/security/validation";
import { rateLimiters, getClientIp } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";
import { runCounterfactualV2 } from "@/lib/ml/counterfactual-v2";
import { cache } from "@/lib/cache/redis";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const auth = await requirePermission("counterfactual:write");
    if (auth instanceof NextResponse) return auth;

    const ip = getClientIp(req);
    const rl = await rateLimiters.api(auth.session.user.id ?? ip);
    if (!rl.allowed) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Rate limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } })
      );
    }

    const body = await req.json();
    const { userId } = validate(counterfactualRequestSchema, body);

    // Cache lookup
    const cacheKey = `counterfactual:${userId}`;
    const cached = await cache.get<any>(cacheKey);
    if (cached) {
      metrics.increment("api_counterfactual_runs_total");
      metrics.increment("http_requests_total");
      metrics.observe("http_request_duration_ms", Date.now() - start);
      return applySecurityHeaders(NextResponse.json({ ...cached, cached: true }));
    }

    const store = useForgeStore.getState();
    const user = store.dataset.users.find((u) => u.id === userId);
    if (!user) {
      return applySecurityHeaders(
        NextResponse.json({ error: "User not found" }, { status: 404 })
      );
    }

    const result = runCounterfactualV2(user, store.dataset.users);
    await cache.set(cacheKey, result, 300);

    metrics.increment("api_counterfactual_runs_total");
    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return applySecurityHeaders(NextResponse.json(result));
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("POST /api/counterfactual failed", {}, err as Error);
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
