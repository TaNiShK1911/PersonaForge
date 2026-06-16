// ============================================================
// PersonaForge — Server Startup Instrumentation
// ============================================================
// This file runs ONCE when the Next.js server boots, before
// any request is handled. We use it to validate production
// readiness (env vars, DB connectivity, Redis, etc.).
//
// IMPORTANT: runs in the Node.js runtime, NOT Edge.
// ============================================================

export async function register() {
  // Only run on server side
  if (typeof window !== "undefined") return;

  const env = process.env.NODE_ENV ?? "development";
  console.log(`[instrumentation] PersonaForge starting in ${env} mode`);

  try {
    const { validateProductionReadiness } = await import("@/lib/monitoring/readiness");
    const report = await validateProductionReadiness();
    if (!report.ready && env === "production") {
      // validateProductionReadiness throws — caught below — but just in case:
      console.error("[instrumentation] Production readiness failed, exiting.");
      // Use Node-only process via globalThis indirection (instrumentation runs in Node)
      const g = globalThis as unknown as { process?: { exit: (code: number) => void } };
      if (g.process?.exit) g.process.exit(1);
    }
    console.log(
      `[instrumentation] Readiness: ${report.ready ? "OK" : "DEGRADED"} — ` +
        `${report.fatalFailures} fatal, ${report.warnings} warnings`
    );
  } catch (err) {
    console.error("[instrumentation] Readiness check failed:", err);
    if (env === "production") {
      // Hard exit in production
      const g = globalThis as unknown as { process?: { exit: (code: number) => void } };
      if (g.process?.exit) g.process.exit(1);
    }
  }
}
