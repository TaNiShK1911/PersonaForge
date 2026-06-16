// ============================================================
// /api/personas — List all personas (HARD DB)
// ============================================================

import { NextResponse } from "next/server";
import {
  fetchPersonas,
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
    const auth = await requirePermission("personas:read");
    if (auth instanceof NextResponse) return auth;

    const cacheKey = "personas:all";
    let personas = await cache.get<any>(cacheKey);
    let cached = false;
    if (personas) {
      cached = true;
    } else {
      personas = await fetchPersonas();
      await cache.set(cacheKey, personas, 600);
    }

    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return applySecurityHeaders(
      NextResponse.json({ personas, cached })
    );
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("GET /api/personas failed", {}, err as Error);
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
