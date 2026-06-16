// ============================================================
// PersonaForge — Root API (replaces "Hello World" stub)
// ============================================================
// GET /api → service info + link to OpenAPI docs
// ============================================================

import { NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET() {
  const res = NextResponse.json({
    name: "PersonaForge API",
    version: "1.0.0",
    description: "Causal Micro-Persona Engine — production backend",
    docs: "/api/docs",
    health: "/api/health",
    metrics: "/api/metrics",
    endpoints: [
      "GET    /api/users",
      "GET    /api/users/{id}",
      "GET    /api/personas",
      "GET    /api/analytics",
      "GET    /api/bandit",
      "POST   /api/bandit/update",
      "POST   /api/counterfactual",
      "POST   /api/personalize",
      "POST   /api/events",
      "GET    /api/health",
      "GET    /api/metrics",
      "GET    /api/docs",
    ],
  });
  return applySecurityHeaders(res);
}
