// ============================================================
// /api/bandit — Get current bandit state
// ============================================================

import { NextResponse } from "next/server";
import { useForgeStore } from "@/lib/store";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";
import { cache } from "@/lib/cache/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    const auth = await requirePermission("bandit:read");
    if (auth instanceof NextResponse) return auth;

    const cacheKey = "bandit:state";
    const cached = await cache.get<any>(cacheKey);
    if (cached) {
      metrics.increment("http_requests_total");
      metrics.observe("http_request_duration_ms", Date.now() - start);
      return applySecurityHeaders(NextResponse.json({ ...cached, cached: true }));
    }

    const state = useForgeStore.getState().bandit;
    await cache.set(cacheKey, state, 5); // very short TTL — state changes often

    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return applySecurityHeaders(NextResponse.json(state));
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("GET /api/bandit failed", {}, err as Error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
