// ============================================================
// PersonaForge — Sentry Integration (lazy-loaded)
// ============================================================
// In production with SENTRY_DSN configured, errors are forwarded
// to Sentry. In dev, errors just log to console.
// ============================================================

import { logger } from "./logger";

let sentryInitialized = false;
let sentryHub: { captureException: (e: Error) => void; captureMessage: (m: string) => void } | null = null;

export async function initSentry(): Promise<void> {
  if (sentryInitialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.debug("Sentry disabled (no SENTRY_DSN)");
    return;
  }
  try {
    // Lazy-load Sentry to avoid bundling it when not configured
    const Sentry = await import("@sentry/node").catch(() => null);
    if (!Sentry) {
      logger.warn("Sentry SDK not installed, skipping initialization");
      return;
    }
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      release: process.env.APP_VERSION ?? "personaforge@1.0.0",
    });
    sentryHub = {
      captureException: (e: Error) => Sentry.captureException(e),
      captureMessage: (m: string) => Sentry.captureMessage(m),
    };
    sentryInitialized = true;
    logger.info("Sentry initialized", { dsn: dsn.slice(0, 20) + "..." });
  } catch (err) {
    logger.warn("Failed to initialize Sentry:", { error: (err as Error).message });
  }
}

export function captureException(err: Error, context?: Record<string, unknown>): void {
  logger.error(err.message, context, err);
  if (sentryHub) {
    try {
      sentryHub.captureException(err);
    } catch {
      /* swallow */
    }
  }
}

export function captureMessage(msg: string, level: "info" | "warning" | "error" = "info"): void {
  if (level === "error") logger.error(msg);
  else if (level === "warning") logger.warn(msg);
  else logger.info(msg);
  if (sentryHub) {
    try {
      sentryHub.captureMessage(msg);
    } catch {
      /* swallow */
    }
  }
}
