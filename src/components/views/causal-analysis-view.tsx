"use client";

import { motion } from "framer-motion";
import { useForgeStore } from "@/lib/store";
import {
  TREATMENT_META,
  TreatmentVariable,
  CausalEffect,
} from "@/lib/types";
import { GlassPanel, StatPill } from "@/components/personaforge/primitives";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ErrorBar,
  Legend,
} from "recharts";
import { GitBranch, ArrowRight, ArrowLeftRight } from "lucide-react";

export function CausalAnalysisView() {
  const causalEffects = useForgeStore((s) => s.causalEffects);
  const causalGraph = useForgeStore((s) => s.causalGraph);

  const barData = causalEffects.map((e) => ({
    name: TREATMENT_META[e.treatment].label,
    ate: +(e.ate * 100).toFixed(2),
    ci_lower: +((e.ate - e.ci_lower) * 100).toFixed(2),
    ci_upper: +((e.ci_upper - e.ate) * 100).toFixed(2),
    color: TREATMENT_META[e.treatment].color,
    pValue: e.pValue,
    sampleTreated: e.sampleTreated,
    sampleControl: e.sampleControl,
    conversionTreated: +(e.conversionTreated * 100).toFixed(1),
    conversionControl: +(e.conversionControl * 100).toFixed(1),
  }));

  // Treatment vs control conversion comparison
  const conversionData = causalEffects.map((e) => ({
    name: TREATMENT_META[e.treatment].label,
    control: +(e.conversionControl * 100).toFixed(1),
    treated: +(e.conversionTreated * 100).toFixed(1),
    color: TREATMENT_META[e.treatment].color,
  }));

  return (
    <div className="space-y-4">
      {/* Methodology banner */}
      <GlassPanel className="border-violet-500/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/15 border border-violet-500/40 flex items-center justify-center shrink-0">
            <GitBranch className="w-5 h-5 text-violet-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">DoWhy-Style Backdoor Adjustment</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We estimate the Average Treatment Effect (ATE) of each marketing treatment on conversion
              by adjusting for confounders — price sensitivity, urgency response, review reliance, and
              trend affinity. Within each stratum we compare treated vs. control conversion rates and
              aggregate via inverse-variance weighting. Bootstrap 80 resamples give 90% CIs; permutation
              tests (200 resamples) yield p-values.
            </p>
          </div>
        </div>
      </GlassPanel>

      {/* ATE bar chart with CI */}
      <GlassPanel
        title="Average Treatment Effect (ATE) on Conversion"
        subtitle="Effect of each treatment on conversion probability, with 90% bootstrap CIs"
        right={
          <div className="flex items-center gap-2">
            <StatPill label="Significant" value={causalEffects.filter((e) => e.pValue < 0.05).length} color="emerald" />
            <StatPill label="Tested" value={causalEffects.length} color="violet" />
          </div>
        }
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 20, bottom: 10, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                label={{ value: "ATE (percentage points)", angle: -90, position: "insideLeft", offset: 20, style: { fontSize: 11, fill: "#94a3b8" } }}
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.18 0.02 285 / 0.95)",
                  border: "1px solid oklch(1 0 0 / 0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                }}
                formatter={(_v: number, name: string, props: { payload?: { pValue?: number; sampleTreated?: number; sampleControl?: number } }) => {
                  if (name === "ate") return [`+${(props?.payload as { ate?: number })?.ate ?? 0}%`, "ATE"];
                  return [String(_v), name];
                }}
                labelFormatter={(label, payload) => {
                  const p = payload?.[0]?.payload as { pValue?: number; sampleTreated?: number; sampleControl?: number; conversionTreated?: number; conversionControl?: number };
                  return [
                    label,
                    `p = ${p?.pValue?.toFixed(4)}  ·  Treated n=${p?.sampleTreated}  ·  Control n=${p?.sampleControl}`,
                  ];
                }}
              />
              <Bar dataKey="ate" radius={[6, 6, 0, 0]}>
                {barData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
                <ErrorBar
                  dataKey="ci_lower"
                  strokeWidth={1.5}
                  stroke="#fff"
                  strokeOpacity={0.5}
                  direction="y"
                />
                <ErrorBar
                  dataKey="ci_upper"
                  strokeWidth={1.5}
                  stroke="#fff"
                  strokeOpacity={0.5}
                  direction="y"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>

      {/* Treatment vs Control side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPanel
          title="Treated vs. Control Conversion"
          subtitle="Conversion rate when treatment was applied vs. withheld"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionData} margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.02 285 / 0.95)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="control" name="Control" fill="#64748b" radius={[4, 4, 0, 0]} fillOpacity={0.6} />
                <Bar dataKey="treated" name="Treated" radius={[4, 4, 0, 0]}>
                  {conversionData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel
          title="Causal Graph"
          subtitle="Treatment → outcome edges, with observed confounders"
        >
          <CausalGraphViz effects={causalEffects} />
        </GlassPanel>
      </div>

      {/* Detailed table */}
      <GlassPanel
        title="Detailed Treatment Effects"
        subtitle="Per-treatment ATE, confidence intervals, sample sizes, and statistical significance"
      >
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-white/5">
                <th className="text-left font-medium py-2 px-2">Treatment</th>
                <th className="text-left font-medium py-2 px-2">Description</th>
                <th className="text-right font-medium py-2 px-2">ATE</th>
                <th className="text-right font-medium py-2 px-2">90% CI</th>
                <th className="text-right font-medium py-2 px-2">p-value</th>
                <th className="text-right font-medium py-2 px-2">Treated / Control</th>
                <th className="text-right font-medium py-2 px-2">Conv. T / C</th>
                <th className="text-center font-medium py-2 px-2">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {causalEffects.map((e, i) => {
                const meta = TREATMENT_META[e.treatment];
                const sig = e.pValue < 0.05;
                return (
                  <motion.tr
                    key={e.treatment}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                        <span className="font-medium">{meta.label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-xs text-muted-foreground max-w-xs">
                      {meta.description}
                    </td>
                    <td className="text-right py-3 px-2 font-mono font-semibold text-emerald-400">
                      +{(e.ate * 100).toFixed(2)}pp
                    </td>
                    <td className="text-right py-3 px-2 font-mono text-xs text-muted-foreground">
                      [{(e.ci_lower * 100).toFixed(2)}, {(e.ci_upper * 100).toFixed(2)}]
                    </td>
                    <td className="text-right py-3 px-2 font-mono text-xs">
                      <span className={sig ? "text-emerald-400" : "text-muted-foreground"}>
                        {e.pValue.toFixed(4)}
                      </span>
                    </td>
                    <td className="text-right py-3 px-2 font-mono text-xs">
                      {e.sampleTreated} / {e.sampleControl}
                    </td>
                    <td className="text-right py-3 px-2 font-mono text-xs">
                      {(e.conversionTreated * 100).toFixed(1)}% / {(e.conversionControl * 100).toFixed(1)}%
                    </td>
                    <td className="text-center py-3 px-2">
                      {sig ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 font-medium">
                          Causal
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-700 font-medium">
                          Correlation
                        </span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}

function CausalGraphViz({ effects }: { effects: CausalEffect[] }) {
  // Simple SVG-based causal graph
  const treatments = effects.map((e) => e.treatment);
  const confounders = ["Price Sens.", "Urgency", "Reviews", "Trend"];

  // Layout: treatments on left, outcome on right, confounders on top
  const w = 480;
  const h = 320;
  const treatmentX = 80;
  const outcomeX = 400;
  const outcomeY = h / 2;
  const confounderY = 30;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-72">
        {/* Edges from confounders to treatments and outcome */}
        {confounders.map((_, i) => {
          const cy = confounderY + i * 0;
          void cy;
          return null;
        })}

        {/* Treatment → Outcome edges */}
        {treatments.map((t, i) => {
          const y = 50 + i * 60;
          const effect = effects.find((e) => e.treatment === t)!;
          const meta = TREATMENT_META[t];
          const strokeWidth = Math.max(1.5, Math.min(5, Math.abs(effect.ate) * 30));
          const midX = (treatmentX + outcomeX) / 2;
          return (
            <g key={t}>
              <motion.path
                d={`M ${treatmentX + 60} ${y} C ${midX} ${y}, ${midX} ${outcomeY}, ${outcomeX - 50} ${outcomeY}`}
                fill="none"
                stroke={meta.color}
                strokeWidth={strokeWidth}
                strokeOpacity={0.7}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: i * 0.15, duration: 0.8 }}
              />
              <text
                x={midX}
                y={(y + outcomeY) / 2 + 4}
                textAnchor="middle"
                fill={meta.color}
                fontSize="10"
                fontWeight="600"
              >
                +{(effect.ate * 100).toFixed(1)}pp
              </text>
            </g>
          );
        })}

        {/* Confounders → Treatment (faded gray) */}
        {treatments.map((t, i) => {
          const y = 50 + i * 60;
          return confounders.map((c, j) => {
            const cx = treatmentX - 20 + j * 90;
            void cx;
            void c;
            return null;
          }).length > 0 ? (
            <line
              key={`conf-${t}`}
              x1={treatmentX - 10}
              y1={20}
              x2={treatmentX + 50}
              y2={y}
              stroke="#64748b"
              strokeOpacity={0.15}
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          ) : null;
        })}

        {/* Treatment nodes */}
        {treatments.map((t, i) => {
          const y = 50 + i * 60;
          const meta = TREATMENT_META[t];
          return (
            <g key={`node-${t}`}>
              <rect
                x={treatmentX}
                y={y - 16}
                width={120}
                height={32}
                rx={8}
                fill={`${meta.color}22`}
                stroke={meta.color}
                strokeOpacity={0.6}
              />
              <text
                x={treatmentX + 60}
                y={y + 4}
                textAnchor="middle"
                fill="#fff"
                fontSize="11"
                fontWeight="500"
              >
                {meta.label}
              </text>
            </g>
          );
        })}

        {/* Outcome node */}
        <g>
          <rect
            x={outcomeX - 50}
            y={outcomeY - 24}
            width={100}
            height={48}
            rx={10}
            fill="url(#outcomeGrad)"
            stroke="#e879f9"
            strokeOpacity={0.8}
            strokeWidth={1.5}
          />
          <text
            x={outcomeX}
            y={outcomeY + 5}
            textAnchor="middle"
            fill="#fff"
            fontSize="13"
            fontWeight="600"
          >
            Conversion
          </text>
        </g>

        <defs>
          <linearGradient id="outcomeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#e879f9" stopOpacity={0.4} />
          </linearGradient>
        </defs>
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 bg-violet-400" />
          <span className="text-muted-foreground">Edge width ∝ |ATE|</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowLeftRight className="w-3 h-3 text-slate-500" />
          <span className="text-muted-foreground">Confounders (backdoor adjusted)</span>
        </div>
      </div>
    </div>
  );
}
