// ============================================================
// /api/bandit — Get current bandit state (persisted to DB)
// ============================================================

import { NextResponse } from "next/server";
import {
  fetchBanditStateFromDb,
  DatabaseUnavailableError,
} from "@/lib/db/hard-queries";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";
import { cache } from "@/lib/cache/redis";
import { ARM_META, BANDIT_ARMS, type BanditArm } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    const auth = await requirePermission("bandit:read");
    if (auth instanceof NextResponse) return auth;

    const cacheKey = "bandit:state";
    const cached = await cache.get<any>(cacheKey);
    if (cached) {
      metrics.increment("http_requests_total");
      metrics.observe("http_request_duration_ms", Date.now() - start);
      return applySecurityHeaders(
        NextResponse.json({ ...cached, cached: true })
      );
    }

    // HARD DB: read bandit state from database
    const { variants, observations } = await fetchBanditStateFromDb();

    // Build response shape
    const arms: Record<string, any> = {};
    let bestArm: BanditArm = "discount";
    let bestRate = -1;
    for (const arm of BANDIT_ARMS) {
      const v = variants.find((x: any) => x.armKey === arm);
      const alpha = v?.alpha ?? 1;
      const beta = v?.beta ?? 1;
      const pulls = v?.pulls ?? 0;
      const rewards = v?.rewards ?? 0;
      const observedRate = pulls > 0 ? rewards / pulls : 0;
      arms[arm] = {
        arm,
        alpha,
        beta,
        pulls,
        rewards,
        observedRate,
        expectedValue: alpha / (alpha + beta),
      };
      if (observedRate > bestRate) {
        bestRate = observedRate;
        bestArm = arm;
      }
    }

    const state = {
      arms,
      totalRounds: observations.length,
      history: observations.map((o: any) => ({
        round: o.round,
        chosen: o.chosenArm,
        reward: o.reward,
        cumulativeReward: o.cumulativeReward,
        cumulativeOptimal: o.cumulativeOptimal,
        regret: o.regret,
        explorationRate: o.explorationRate,
      })),
      explorationRate: observations.length > 0
        ? observations[observations.length - 1].explorationRate
        : 0,
      exploitationRate: observations.length > 0
        ? 1 - observations[observations.length - 1].explorationRate
        : 1,
      bestArm,
      conversionImprovement: 0, // computed below
    };

    // Compute conversion improvement
    const otherArms = BANDIT_ARMS.filter((a) => a !== bestArm);
    if (otherArms.length > 0) {
      const otherAvg =
        otherArms.reduce((s, a) => s + arms[a].observedRate, 0) /
        otherArms.length;
      state.conversionImprovement =
        otherAvg > 0
          ? ((arms[bestArm].observedRate - otherAvg) / otherAvg) * 100
          : 0;
    }

    await cache.set(cacheKey, state, 5);

    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return applySecurityHeaders(NextResponse.json(state));
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("GET /api/bandit failed", {}, err as Error);
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
