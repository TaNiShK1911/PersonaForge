// ============================================================
// /api/health — Service health check
// ============================================================

import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/monitoring/health";
import { applySecurityHeaders } from "@/lib/security/headers";
import { apiLogger } from "@/lib/monitoring/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await checkHealth();
    const status = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;
    const res = NextResponse.json(health, { status });
    return applySecurityHeaders(res);
  } catch (err) {
    apiLogger.error("Health check failed", {}, err as Error);
    const res = NextResponse.json(
      {
        status: "unhealthy",
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
    return applySecurityHeaders(res);
  }
}
