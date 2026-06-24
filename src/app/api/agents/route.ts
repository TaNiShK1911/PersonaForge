// ============================================================
// /api/agents — Agent System API
// ============================================================
// GET: List recent agent runs
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiLogger } from "@/lib/monitoring/logger";
import { applySecurityHeaders } from "@/lib/security/headers";
import { marked } from "marked";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
    const status = url.searchParams.get("status") ?? undefined;

    const runs = await db.agentRun.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Parse JSON and markdown fields for the response
    const formattedRuns = await Promise.all(runs.map(async (run) => {
      const parsedTrace = safeJsonParse(run.trace) as any;
      const htmlTrace = Array.isArray(parsedTrace) 
        ? await Promise.all(parsedTrace.map(async (t: any) => ({
            ...t,
            output: t.output ? await marked.parse(t.output) : undefined,
            error: t.error ? await marked.parse(t.error) : undefined
          })))
        : parsedTrace;

      return {
        id: run.id,
        conversationId: run.conversationId,
        triggeredBy: run.triggeredBy,
        status: run.status,
        input: safeJsonParse(run.input),
        output: run.output ? await marked.parse(run.output) : run.output,
        trace: htmlTrace,
        agentsUsed: run.agentsUsed.split(","),
        totalTokens: run.totalTokens,
        latencyMs: run.latencyMs,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
      };
    }));

    return applySecurityHeaders(
      NextResponse.json({ runs: formattedRuns })
    );
  } catch (err) {
    apiLogger.error("GET /api/agents failed", {}, err as Error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}

function safeJsonParse(str: string | null | undefined): unknown {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
