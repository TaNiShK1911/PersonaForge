// ============================================================
// /api/users/{id} — Get a single user with events (HARD DB)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  fetchUserWithEvents,
  DatabaseUnavailableError,
} from "@/lib/db/hard-queries";
import { validate, userIdSchema, ValidationError } from "@/lib/security/validation";
import { rateLimiters, getClientIp } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";
import { cache } from "@/lib/cache/redis";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  try {
    const auth = await requirePermission("users:read");
    if (auth instanceof NextResponse) return auth;

    const ip = getClientIp(req);
    const rl = await rateLimiters.api(ip);
    if (!rl.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Rate limited" },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
        )
      );
    }

    const { id } = await params;
    validate(userIdSchema, { id });

    const cacheKey = `user:${id}`;
    let data = await cache.get<any>(cacheKey);
    let cached = false;
    if (data) {
      cached = true;
    } else {
      data = await fetchUserWithEvents(id);
      if (!data) {
        return applySecurityHeaders(
          NextResponse.json({ error: "User not found" }, { status: 404 })
        );
      }
      await cache.set(cacheKey, data, 300);
    }

    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return applySecurityHeaders(NextResponse.json({ ...data, cached }));
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("GET /api/users/{id} failed", {}, err as Error);
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
