// ============================================================
// /api/analytics — Aggregated analytics (HARD DB)
// ============================================================

import { NextResponse } from "next/server";
import {
  fetchAnalyticsSnapshot,
  DatabaseUnavailableError,
} from "@/lib/db/hard-queries";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";
import { cache } from "@/lib/cache/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    const auth = await requirePermission("analytics:read");
    if (auth instanceof NextResponse) return auth;

    const cacheKey = "analytics:snapshot";
    let snapshot = await cache.get<any>(cacheKey);
    let cached = false;
    if (snapshot) {
      cached = true;
    } else {
      snapshot = await fetchAnalyticsSnapshot();
      await cache.set(cacheKey, snapshot, 300);
    }

    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);
    metrics.setGauge("api_active_users", snapshot.activeUsers ?? 0);

    return applySecurityHeaders(
      NextResponse.json({ ...snapshot, cached })
    );
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("GET /api/analytics failed", {}, err as Error);
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
