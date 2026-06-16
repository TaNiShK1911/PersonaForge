// ============================================================
// /api/bandit/update — Advance bandit by N steps
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { useForgeStore } from "@/lib/store";
import { validate, banditUpdateSchema, ValidationError } from "@/lib/security/validation";
import { rateLimiters, getClientIp } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const auth = await requirePermission("bandit:write");
    if (auth instanceof NextResponse) return auth;

    const ip = getClientIp(req);
    const rl = await rateLimiters.bandit(auth.session.user.id ?? ip);
    if (!rl.allowed) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Rate limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } })
      );
    }

    const body = await req.json();
    const { steps, reset } = validate(banditUpdateSchema, body);

    const store = useForgeStore.getState();
    if (reset) {
      store.resetBandit();
    } else {
      store.stepBanditMany(steps);
    }

    metrics.increment("api_bandit_steps_total", steps);
    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    const state = useForgeStore.getState().bandit;
    return applySecurityHeaders(NextResponse.json({ state, advanced: steps, reset: !!reset }));
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("POST /api/bandit/update failed", {}, err as Error);
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
