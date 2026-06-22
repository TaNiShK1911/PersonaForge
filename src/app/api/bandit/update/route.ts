// ============================================================
// /api/bandit/update — Advance bandit + persist to DB
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyDatabase, DatabaseUnavailableError } from "@/lib/db/hard-queries";
import {
  validate,
  banditUpdateSchema,
  ValidationError,
} from "@/lib/security/validation";
import { rateLimiters, getClientIp } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";
import { stepBandit, createBanditState } from "@/lib/ml/bandit";
import { BANDIT_ARMS, ARM_META, type BanditArm, type BanditState } from "@/lib/types";

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
        NextResponse.json(
          { error: "Rate limited" },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
        )
      );
    }

    const body = await req.json();
    const { steps, reset } = validate(banditUpdateSchema, body);

    await verifyDatabase();

    // Load current state from DB (HARD)
    const variants = await db.banditVariant.findMany({
      where: { isActive: true },
    });

    // Build BanditState from DB rows
    let state: BanditState = createBanditState();
    for (const arm of BANDIT_ARMS) {
      const v = variants.find((x) => x.armKey === arm);
      if (v) {
        state.arms[arm] = {
          arm,
          alpha: v.alpha,
          beta: v.beta,
          pulls: v.pulls,
          rewards: v.rewards,
          observedRate: v.observedRate,
          expectedValue: v.alpha / (v.alpha + v.beta),
        };
      }
    }
    // Load history from DB
    const history = await db.banditObservation.findMany({
      orderBy: { round: "asc" },
      take: 1000,
      include: { variant: true },
    });
    state.history = history.map((h) => ({
      round: h.round,
      chosen: h.variant.armKey as BanditArm,
      reward: h.reward ? 1 : 0,
      cumulativeReward: h.cumulativeReward,
      cumulativeOptimal: h.cumulativeOptimal,
      regret: h.regret,
      explorationRate: h.explorationRate,
    }));
    state.totalRounds = history.length;

    if (reset) {
      state = createBanditState();
      // Clear DB
      await db.banditObservation.deleteMany({});
      for (const arm of BANDIT_ARMS) {
        await db.banditVariant.update({
          where: { armKey: arm },
          data: {
            alpha: 1,
            beta: 1,
            pulls: 0,
            rewards: 0,
            observedRate: 0,
          },
        });
      }
    } else {
      // Run steps
      for (let i = 0; i < steps; i++) {
        state = stepBandit(state);
        // Persist the latest step
        const lastStep = state.history[state.history.length - 1];
        await db.banditObservation.create({
          data: {
            variantId: variants.find((v) => v.armKey === lastStep.chosen)!.id,
            round: lastStep.round,
            reward: lastStep.reward === 1,
            cumulativeReward: lastStep.cumulativeReward,
            cumulativeOptimal: lastStep.cumulativeOptimal,
            regret: lastStep.regret,
            explorationRate: lastStep.explorationRate,
            sampledTheta: state.arms[lastStep.chosen].expectedValue,
          },
        });
      }
      // Update variant posteriors
      for (const arm of BANDIT_ARMS) {
        const armState = state.arms[arm];
        await db.banditVariant.update({
          where: { armKey: arm },
          data: {
            alpha: armState.alpha,
            beta: armState.beta,
            pulls: armState.pulls,
            rewards: armState.rewards,
            observedRate: armState.observedRate,
          },
        });
      }
    }

    metrics.increment("api_bandit_steps_total", steps);
    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return applySecurityHeaders(
      NextResponse.json({
        state,
        advanced: steps,
        reset: !!reset,
      })
    );
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("POST /api/bandit/update failed", {}, err as Error);
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
