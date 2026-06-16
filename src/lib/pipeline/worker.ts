// ============================================================
// PersonaForge — BullMQ Worker Process
// ============================================================
// Run separately from the Next.js server:
//   bun run worker
//
// Consumes jobs from Redis-backed BullMQ queues:
//   - personaforge:events (ingest-event, ingest-batch)
//   - personaforge:analytics (snapshot-analytics)
//   - personaforge:personas (update-persona)
//
// In production this runs as a separate process / container for
// horizontal scaling.
// ============================================================

import { Worker } from "bullmq";
import {
  handleIngestEvent,
  handleIngestBatch,
  handleSnapshotAnalytics,
  handleUpdatePersona,
  tryLoadBullMQ,
} from "@/lib/pipeline/bullmq";
import { logger } from "@/lib/monitoring/logger";

async function startWorker() {
  await tryLoadBullMQ();
  logger.info("worker_starting", { redis: process.env.REDIS_URL });

  if (!process.env.REDIS_URL) {
    logger.error("worker_requires_redis");
    process.exit(1);
  }

  // Event worker
  const eventWorker = new Worker(
    "personaforge:events",
    async (job) => {
      logger.info("event_job_processing", { id: job.id, name: job.name });
      if (job.name === "ingest-event") {
        await handleIngestEvent(job.data);
      } else if (job.name === "ingest-batch") {
        await handleIngestBatch(job.data);
      } else {
        logger.warn("unknown_event_job", { name: job.name });
      }
    },
    { connection: process.env.REDIS_URL, concurrency: 8 }
  );
  eventWorker.on("completed", (job) =>
    logger.info("event_job_completed", { id: job.id })
  );
  eventWorker.on("failed", (job, err) =>
    logger.error("event_job_failed", { id: job?.id, error: err.message }, err)
  );

  // Analytics worker
  const analyticsWorker = new Worker(
    "personaforge:analytics",
    async (job) => {
      if (job.name === "snapshot-analytics") {
        await handleSnapshotAnalytics();
      }
    },
    { connection: process.env.REDIS_URL, concurrency: 2 }
  );

  // Persona worker
  const personaWorker = new Worker(
    "personaforge:personas",
    async (job) => {
      if (job.name === "update-persona") {
        await handleUpdatePersona();
      }
    },
    { connection: process.env.REDIS_URL, concurrency: 1 }
  );

  logger.info("worker_started", {
    queues: ["personaforge:events", "personaforge:analytics", "personaforge:personas"],
  });

  // Graceful shutdown
  const shutdown = async (sig: string) => {
    logger.info("worker_shutdown_begin", { signal: sig });
    await Promise.all([
      eventWorker.close(),
      analyticsWorker.close(),
      personaWorker.close(),
    ]);
    logger.info("worker_shutdown_complete");
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startWorker().catch((err) => {
  logger.error("worker_startup_failed", {}, err);
  process.exit(1);
});
