// ============================================================
// PersonaForge — Metrics Collector
// ============================================================
// Lightweight metrics with counters, gauges, and histograms.
// Exposed at /api/metrics in Prometheus text format.
// ============================================================

interface Metric {
  type: "counter" | "gauge" | "histogram";
  name: string;
  help: string;
  value: number;
  labels: Record<string, string>;
  buckets?: number[];
  observations?: number[];
}

class MetricsRegistry {
  private metrics = new Map<string, Metric>();
  private histograms = new Map<string, { observations: number[]; buckets: number[] }>();

  registerCounter(name: string, help: string): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { type: "counter", name, help, value: 0, labels: {} });
    }
  }

  registerGauge(name: string, help: string): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { type: "gauge", name, help, value: 0, labels: {} });
    }
  }

  registerHistogram(name: string, help: string, buckets: number[] = defaultBuckets): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { type: "histogram", name, help, value: 0, labels: {} });
      this.histograms.set(name, { observations: [], buckets });
    }
  }

  increment(name: string, by = 1): void {
    const m = this.metrics.get(name);
    if (m && m.type === "counter") m.value += by;
  }

  setGauge(name: string, value: number): void {
    const m = this.metrics.get(name);
    if (m && m.type === "gauge") m.value = value;
  }

  observe(name: string, value: number): void {
    const m = this.metrics.get(name);
    if (m && m.type === "histogram") {
      m.value++;
      const h = this.histograms.get(name);
      if (h) h.observations.push(value);
    }
  }

  /** Get a snapshot of all metrics */
  snapshot(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [name, m] of this.metrics.entries()) {
      out[name] = m.value;
    }
    return out;
  }

  /** Render metrics in Prometheus text exposition format */
  toPrometheus(): string {
    const lines: string[] = [];
    for (const [_, m] of this.metrics.entries()) {
      lines.push(`# HELP ${m.name} ${m.help}`);
      lines.push(`# TYPE ${m.name} ${m.type}`);

      if (m.type === "counter" || m.type === "gauge") {
        lines.push(`${m.name} ${m.value}`);
      } else if (m.type === "histogram") {
        const h = this.histograms.get(m.name);
        if (h) {
          for (const bucket of h.buckets) {
            const count = h.observations.filter((v) => v <= bucket).length;
            lines.push(`${m.name}_bucket{le="${bucket}"} ${count}`);
          }
          lines.push(`${m.name}_bucket{le="+Inf"} ${h.observations.length}`);
          lines.push(`${m.name}_count ${h.observations.length}`);
          const sum = h.observations.reduce((a, b) => a + b, 0);
          lines.push(`${m.name}_sum ${sum}`);
        }
      }
    }
    return lines.join("\n");
  }
}

const defaultBuckets = [
  5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
];

// ---------- Singleton registry ----------
const globalForMetrics = globalThis as unknown as { __personaForgeMetrics?: MetricsRegistry };
export const metrics: MetricsRegistry =
  globalForMetrics.__personaForgeMetrics ?? new MetricsRegistry();
if (process.env.NODE_ENV !== "production") {
  globalForMetrics.__personaForgeMetrics = metrics;
}

// ---------- Pre-register standard metrics ----------
metrics.registerCounter("http_requests_total", "Total HTTP requests");
metrics.registerCounter("http_errors_total", "Total HTTP errors (5xx)");
metrics.registerCounter("api_bandit_steps_total", "Total bandit steps");
metrics.registerCounter("api_counterfactual_runs_total", "Total counterfactual runs");
metrics.registerCounter("api_personalizations_total", "Total personalization calls");
metrics.registerCounter("api_events_ingested_total", "Total events ingested");
metrics.registerGauge("api_active_users", "Currently active users");
metrics.registerGauge("api_db_connections", "Active DB connections");
metrics.registerGauge("cache_memory_size", "In-memory cache size");
metrics.registerHistogram("http_request_duration_ms", "HTTP request duration in ms");
metrics.registerHistogram("ai_provider_latency_ms", "AI provider call latency in ms");
metrics.registerHistogram("causal_estimation_duration_ms", "Causal ATE estimation duration in ms");
