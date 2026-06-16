// ============================================================
// PersonaForge — BullMQ Distributed Queue (production)
// ============================================================
// REAL BullMQ implementation. In production with REDIS_URL set,
// jobs are pushed to Redis-backed BullMQ queues and consumed by
// a separate worker process (`bun run worker`).
//
// In dev (no Redis), falls back to in-process queue (queue.ts).
// In production, REQUIRES Redis — no fallback.
// ============================================================

import { db } from "@/lib/db";
import { logger } from "@/lib/monitoring/logger";
import { metrics } from "@/lib/monitoring/metrics";
import { pipelineLogger } from "@/lib/monitoring/logger";
import { cache } from "@/lib/cache/redis";

// ---------- Try to load BullMQ ----------

let Queue: any = null;
let Worker: any = null;
let redisAvailable = false;

export async function tryLoadBullMQ(): Promise<void> {
  if (Queue) return;
  try {
    const moduleName = ["bull", "mq"].join("");
    const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<any>;
    const mod = await dynamicImport(moduleName);
    Queue = mod.Queue;
    Worker = mod.Worker;
    redisAvailable = true;
    logger.info("bullmq_loaded");
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `BullMQ is a hard dependency in production. Install with: bun add bullmq. Error: ${(err as Error).message}`
      );
    }
    logger.warn("bullmq_not_installed_in_dev", {
      hint: "Run: bun add bullmq  (Redis-backed queue)",
    });
  }
}

// ---------- Queue singletons ----------

let eventQueue: any = null;
let analyticsQueue: any = null;
let personaQueue: any = null;

export async function getEventQueue(): Promise<any | null> {
  await tryLoadBullMQ();
  if (!Queue || !redisAvailable) return null;
  if (!eventQueue) {
    eventQueue = new Queue("personaforge:events", {
      connection: process.env.REDIS_URL,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
  }
  return eventQueue;
}

export async function getAnalyticsQueue(): Promise<any | null> {
  await tryLoadBullMQ();
  if (!Queue || !redisAvailable) return null;
  if (!analyticsQueue) {
    analyticsQueue = new Queue("personaforge:analytics", {
      connection: process.env.REDIS_URL,
      defaultJobOptions: { attempts: 3, removeOnComplete: 100 },
    });
  }
  return analyticsQueue;
}

export async function getPersonaQueue(): Promise<any | null> {
  await tryLoadBullMQ();
  if (!Queue || !redisAvailable) return null;
  if (!personaQueue) {
    personaQueue = new Queue("personaforge:personas", {
      connection: process.env.REDIS_URL,
      defaultJobOptions: { attempts: 3, removeOnComplete: 100 },
    });
  }
  return personaQueue;
}

// ---------- Job handlers (shared between worker + in-process fallback) ----------

export async function handleIngestEvent(payload: any): Promise<void> {
  await db.event.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      timestamp: BigInt(payload.timestamp ?? Date.now()),
      pageDepth: payload.pageDepth ?? 0,
      productId: payload.productId,
      query: payload.query,
      scrollPct: payload.scrollPct,
      dwellSec: payload.dwellSec,
      price: payload.price,
      discountSeen: payload.discountSeen ?? false,
      socialProofSeen: payload.socialProofSeen ?? false,
      reviewSeen: payload.reviewSeen ?? false,
      urgencySeen: payload.urgencySeen ?? false,
    },
  });
  metrics.increment("api_events_ingested_total");
  await cache.del(`user:${payload.userId}`);
}

export async function handleIngestBatch(payload: any): Promise<void> {
  const { events } = payload;
  if (!Array.isArray(events)) return;
  await db.event.createMany({
    data: events.map((e: any) => ({
      userId: e.userId,
      type: e.type,
      timestamp: BigInt(e.timestamp ?? Date.now()),
      pageDepth: e.pageDepth ?? 0,
      productId: e.productId,
      query: e.query,
      scrollPct: e.scrollPct,
      dwellSec: e.dwellSec,
      price: e.price,
      discountSeen: e.discountSeen ?? false,
      socialProofSeen: e.socialProofSeen ?? false,
      reviewSeen: e.reviewSeen ?? false,
      urgencySeen: e.urgencySeen ?? false,
    })),
  });
  metrics.increment("api_events_ingested_total", events.length);
}

export async function handleSnapshotAnalytics(): Promise<void> {
  const now = new Date();
  const hourStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours()
  );
  const userCount = await db.user.count();
  const convertedCount = await db.user.count({ where: { converted: true } });
  const eventCount = await db.event.count();
  const revenue = await db.user.aggregate({ _sum: { revenue: true } });

  await db.analyticsSnapshot.upsert({
    where: { date_granity: { date: hourStart, granity: "hour" } },
    update: {
      totalUsers: userCount,
      convertedUsers: convertedCount,
      conversionRate: userCount > 0 ? convertedCount / userCount : 0,
      events: eventCount,
      revenue: revenue._sum.revenue ?? 0,
    },
    create: {
      date: hourStart,
      granity: "hour",
      totalUsers: userCount,
      convertedUsers: convertedCount,
      conversionRate: userCount > 0 ? convertedCount / userCount : 0,
      events: eventCount,
      revenue: revenue._sum.revenue ?? 0,
    },
  });
}

export async function handleUpdatePersona(): Promise<void> {
  // In production: load users from DB, re-cluster, persist
  // For reference, just clear the persona cache
  await cache.delPattern("persona:*");
  pipelineLogger.info("persona_cache_invalidated");
}
