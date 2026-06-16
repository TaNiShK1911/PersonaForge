// ============================================================
// /api/users — List users (HARD DB dependency)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  fetchUsers,
  DatabaseUnavailableError,
} from "@/lib/db/hard-queries";
import { validate, userListQuerySchema, ValidationError } from "@/lib/security/validation";
import { rateLimiters, getClientIp } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const auth = await requirePermission("users:read");
    if (auth instanceof NextResponse) return auth;

    const ip = getClientIp(req);
    const rl = await rateLimiters.api(ip);
    if (!rl.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Rate limited", retryAfter: rl.retryAfterSec },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
        )
      );
    }

    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);
    const { limit, offset, persona, search, converted } = validate(
      userListQuerySchema,
      params
    );

    const { users, total } = await fetchUsers({
      limit,
      offset,
      persona,
      search,
      converted: converted !== undefined ? converted === "true" : undefined,
    });

    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return applySecurityHeaders(
      NextResponse.json({
        users,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + users.length < total,
        },
      })
    );
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("GET /api/users failed", {}, err as Error);
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
          {
            error: "Database unavailable",
            message: err.message,
          },
          { status: 503 }
        )
      );
    }
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
