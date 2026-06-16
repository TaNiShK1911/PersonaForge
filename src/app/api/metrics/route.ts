// ============================================================
// /api/metrics — Prometheus-format metrics
// ============================================================

import { NextResponse } from "next/server";
import { metrics } from "@/lib/monitoring/metrics";
import { applySecurityHeaders } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const body = metrics.toPrometheus();
  const res = new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4",
      "Cache-Control": "no-store",
    },
  });
  return applySecurityHeaders(res);
}
