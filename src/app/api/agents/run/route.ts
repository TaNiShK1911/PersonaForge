// ============================================================
// /api/agents/run — Execute Agent Chain
// ============================================================
// POST: Trigger a full agent analysis run
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { runAgentAnalysis } from "@/lib/agents/supervisor-agent";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { applySecurityHeaders } from "@/lib/security/headers";
import { marked } from "marked";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body = await req.json();
    const { userId, question, goal, conversationId, triggeredBy } = body;

    if (!triggeredBy) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Missing required field: triggeredBy" },
          { status: 400 }
        )
      );
    }

    let actualUserId = userId;
    if (userId === "latest") {
      const { db } = await import("@/lib/db");
      const lastEvent = await db.event.findFirst({
        orderBy: { timestamp: "desc" },
        select: { userId: true },
      });
      actualUserId = lastEvent?.userId;
    }

    const result = await runAgentAnalysis({
      userId: actualUserId,
      question,
      goal: goal ?? question ?? "Full analysis",
      conversationId,
      triggeredBy,
    });

    metrics.increment("agent_runs_total");
    metrics.observe("agent_run_duration_ms", Date.now() - start);

    const htmlOutput = result.state.finalRecommendation 
      ? await marked.parse(result.state.finalRecommendation) 
      : null;

    const htmlTrace = await Promise.all(
      result.state.trace.map(async (t) => ({
        ...t,
        output: t.output ? await marked.parse(t.output) : undefined,
        error: t.error ? await marked.parse(t.error) : undefined,
      }))
    );

    return applySecurityHeaders(
      NextResponse.json({
        runId: result.runId,
        status: result.state.errors.length > 0 ? "completed_with_errors" : "completed",
        output: htmlOutput,
        trace: htmlTrace,
        personaProfile: result.state.personaProfile,
        generatedContent: result.state.generatedContent,
        treatmentChoice: result.state.treatmentChoice,
        insights: result.state.insights,
        counterfactualResult: result.state.counterfactualResult,
        totalTokens: result.state.totalTokens,
        latencyMs: Date.now() - start,
        errors: result.state.errors,
      })
    );
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("POST /api/agents/run failed", {}, err as Error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Agent run failed", details: (err as Error).message },
        { status: 500 }
      )
    );
  }
}
