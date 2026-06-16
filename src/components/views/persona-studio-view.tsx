"use client";

import { motion } from "framer-motion";
import { useForgeStore } from "@/lib/store";
import { PERSONA_META, PERSONA_KINDS } from "@/lib/types";
import { GlassPanel, StatPill } from "@/components/personaforge/primitives";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Boxes, Target, DollarSign, Users } from "lucide-react";

export function PersonaStudioView() {
  const dataset = useForgeStore((s) => s.dataset);
  const personas = useForgeStore((s) => s.personas);

  // Build scatter data — sample 400 users for clarity
  const scatterData = PERSONA_KINDS.map((kind) => ({
    kind,
    name: PERSONA_META[kind].name,
    color: PERSONA_META[kind].color,
    data: dataset.users
      .filter((u) => u.persona === kind)
      .slice(0, 70)
      .map((u) => ({
        x: +(u.features.embeddingX * 100).toFixed(1),
        y: +(u.features.embeddingY * 100).toFixed(1),
        name: u.name,
        converted: u.converted,
      })),
  }));

  // Centroids (persona behavior embeddings)
  const centroids = personas.map((p) => ({
    x: +(p.behavior_embedding.x * 100).toFixed(1),
    y: +(p.behavior_embedding.y * 100).toFixed(1),
    name: p.persona_name,
  }));

  return (
    <div className="space-y-4">
      {/* Persona cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {personas.map((p, i) => {
          const meta = PERSONA_META[p.kind];
          return (
            <motion.div
              key={p.kind}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="rounded-xl glass p-5 border relative overflow-hidden"
              style={{ borderColor: `${meta.color}33` }}
            >
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ background: `radial-gradient(40rem 20rem at 80% -20%, ${meta.color}, transparent 60%)` }}
              />
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}
                    >
                      {meta.emoji}
                    </span>
                    <div>
                      <h3 className="font-semibold">{p.persona_name}</h3>
                      <div className="text-[11px] text-muted-foreground">
                        {p.memberCount.toLocaleString()} members · {(p.confidence * 100).toFixed(0)}% conf.
                      </div>
                    </div>
                  </div>
                  <div
                    className="w-2 h-2 rounded-full mt-1.5"
                    style={{ background: meta.color }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mb-3">{meta.tagline}</p>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-lg bg-white/[0.03] p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      <Target className="w-3 h-3" />
                      Conv. Rate
                    </div>
                    <div className="text-base font-semibold text-emerald-400">
                      {(p.avgConversion * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      <DollarSign className="w-3 h-3" />
                      Avg Rev
                    </div>
                    <div className="text-base font-semibold">${p.avgRevenue.toFixed(0)}</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {p.traits.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-1 h-1 rounded-full"
                        style={{ background: meta.color }}
                      />
                      <span className="text-foreground/80">{t}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-white/5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    Top behavioral features
                  </div>
                  <div className="space-y-1">
                    {p.topFeatures.map((f) => (
                      <div key={f.feature} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground capitalize">
                          {f.feature.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${f.value * 100}%`,
                                background: meta.color,
                              }}
                            />
                          </div>
                          <span className="font-mono w-7 text-right">
                            {(f.value * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Embedding scatter */}
      <GlassPanel
        title="Persona Embedding Space"
        subtitle="2D t-SNE-style projection of behavior vectors — 6 clusters identified via k-means"
        right={<StatPill label="Clusters" value={personas.length} color="violet" />}
      >
        <div className="h-[460px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="Price × Brand"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                label={{ value: "→ Price Sensitivity", position: "insideBottom", offset: -10, style: { fontSize: 11, fill: "#94a3b8" } }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Urgency × Trend"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                label={{ value: "↑ Impulse / Trend Drive", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: "#94a3b8" } }}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3", stroke: "#a78bfa" }}
                contentStyle={{
                  background: "oklch(0.18 0.02 285 / 0.95)",
                  border: "1px solid oklch(1 0 0 / 0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                }}
                formatter={(v: number, n: string) => [v.toFixed(1), n === "x" ? "Price-Drive" : "Impulse-Drive"]}
              />
              {scatterData.map((cluster) => (
                <Scatter
                  key={cluster.kind}
                  name={cluster.name}
                  data={cluster.data}
                  fill={cluster.color}
                  fillOpacity={0.55}
                  stroke={cluster.color}
                  strokeOpacity={0.8}
                />
              ))}
              <ReferenceLine x={50} stroke="#fff" strokeOpacity={0.1} />
              <ReferenceLine y={50} stroke="#fff" strokeOpacity={0.1} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {scatterData.map((c) => (
            <div key={c.kind} className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
              <span className="text-muted-foreground">{c.name}</span>
              <span className="font-mono text-[11px]">({c.data.length})</span>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Centroid table */}
      <GlassPanel
        title="Persona Centroids"
        subtitle="Cluster centers in the 2D behavior embedding space"
      >
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-white/5">
                <th className="text-left font-medium py-2 px-2">Persona</th>
                <th className="text-right font-medium py-2 px-2">Embedding X</th>
                <th className="text-right font-medium py-2 px-2">Embedding Y</th>
                <th className="text-right font-medium py-2 px-2">Members</th>
                <th className="text-right font-medium py-2 px-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {personas.map((p) => {
                const meta = PERSONA_META[p.kind];
                return (
                  <tr key={p.kind} className="border-b border-white/[0.03]">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                          style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}
                        >
                          {meta.emoji}
                        </span>
                        <span className="font-medium">{p.persona_name}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2 font-mono text-xs">
                      {(p.behavior_embedding.x * 100).toFixed(1)}
                    </td>
                    <td className="text-right py-3 px-2 font-mono text-xs">
                      {(p.behavior_embedding.y * 100).toFixed(1)}
                    </td>
                    <td className="text-right py-3 px-2 font-mono">{p.memberCount}</td>
                    <td className="text-right py-3 px-2">
                      <span className="font-mono text-xs" style={{ color: meta.color }}>
                        {(p.confidence * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}
