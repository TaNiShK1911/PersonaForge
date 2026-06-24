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

    const result = await runAgentAnalysis({
      userId,
      question,
      goal: goal ?? question ?? "Full analysis",
      conversationId,
      triggeredBy,
    });

    metrics.increment("agent_runs_total");
    metrics.observe("agent_run_duration_ms", Date.now() - start);

    return applySecurityHeaders(
      NextResponse.json({
        runId: result.runId,
        status: result.state.errors.length > 0 ? "completed_with_errors" : "completed",
        output: result.state.finalRecommendation,
        trace: result.state.trace,
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
