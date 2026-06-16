// ============================================================
// PersonaForge — Structured Logger
// ============================================================
// JSON-formatted logs in production, pretty-printed in dev.
// Log levels: trace < debug < info < warn < error < fatal.
// Severity filtering via LOG_LEVEL env var.
// ============================================================

type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

const configuredLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ?? "info";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel = configuredLevel;
  private service: string;
  private env: string;

  constructor(service = "personaforge") {
    this.service = service;
    this.env = process.env.NODE_ENV ?? "development";
  }

  child(service: string): Logger {
    const c = new Logger(service);
    c.level = this.level;
    return c;
  }

  trace(msg: string, ctx?: LogContext) { this.log("trace", msg, ctx); }
  debug(msg: string, ctx?: LogContext) { this.log("debug", msg, ctx); }
  info(msg: string, ctx?: LogContext) { this.log("info", msg, ctx); }
  warn(msg: string, ctx?: LogContext) { this.log("warn", msg, ctx); }
  error(msg: string, ctx?: LogContext, err?: Error) {
    this.log("error", msg, { ...ctx, error: err ? serializeError(err) : undefined });
  }
  fatal(msg: string, ctx?: LogContext, err?: Error) {
    this.log("fatal", msg, { ...ctx, error: err ? serializeError(err) : undefined });
  }

  private log(level: LogLevel, msg: string, ctx?: LogContext) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      environment: this.env,
      msg,
      ...ctx,
    };

    if (this.env === "production") {
      // Structured JSON for log aggregators (Logtail, Datadog, etc.)
      console.log(JSON.stringify(entry));
    } else {
      // Pretty-printed for dev
      const color = getColor(level);
      const ctxStr = ctx ? " " + JSON.stringify(ctx) : "";
      console.log(
        `${color}[${level.toUpperCase().padEnd(5)}]${resetColor} ${msg}${ctxStr}`
      );
    }
  }
}

function serializeError(err: Error): { name: string; message: string; stack?: string } {
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
}

function getColor(level: LogLevel): string {
  switch (level) {
    case "trace": return "\x1b[90m";
    case "debug": return "\x1b[36m";
    case "info": return "\x1b[32m";
    case "warn": return "\x1b[33m";
    case "error": return "\x1b[31m";
    case "fatal": return "\x1b[41m\x1b[37m";
    default: return "";
  }
}

const resetColor = "\x1b[0m";

export const logger = new Logger();
export const apiLogger = logger.child("api");
export const mlLogger = logger.child("ml");
export const cacheLogger = logger.child("cache");
export const pipelineLogger = logger.child("pipeline");
export const authLogger = logger.child("auth");
