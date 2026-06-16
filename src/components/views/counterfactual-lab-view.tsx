"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForgeStore } from "@/lib/store";
import {
  TREATMENT_META,
  TREATMENTS,
  TreatmentVariable,
  PERSONA_META,
} from "@/lib/types";
import { runCounterfactual, buildCustomScenario } from "@/lib/ml/counterfactual";
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
  LabelList,
} from "recharts";
import { FlaskConical, Sparkles, Trophy, RotateCcw, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CounterfactualLabView() {
  const dataset = useForgeStore((s) => s.dataset);
  const selectedUserId = useForgeStore((s) => s.selectedUserId);
  const selectUser = useForgeStore((s) => s.selectUser);

  const [userQuery, setUserQuery] = useState("");
  const [customToggles, setCustomToggles] = useState<
    Partial<Record<TreatmentVariable, boolean>>
  >({ discount: true, social_proof: false, product_reviews: false, urgency_messaging: false });

  const selectedUser =
    dataset.users.find((u) => u.id === selectedUserId) ?? dataset.users[0];

  const result = useMemo(
    () => runCounterfactual(selectedUser, dataset.users),
    [selectedUser, dataset.users]
  );

  const customScenario = useMemo(
    () =>
      buildCustomScenario(
        selectedUser,
        dataset.users,
        customToggles,
        "Your Custom Scenario",
        "User-defined treatment combination"
      ),
    [selectedUser, dataset.users, customToggles]
  );

  const allScenarios = [result.baseline, ...result.scenarios, customScenario];

  const chartData = allScenarios.map((s) => ({
    name: s.label.replace(/^Scenario [A-D]: /, "").replace(/^Baseline.*$/, "Baseline"),
    full: s.label,
    probability: +(s.conversionProbability * 100).toFixed(1),
    uplift: +s.upliftPct.toFixed(1),
    isWinner: s.id === result.winner.id,
    isCustom: s.id === customScenario.id,
    isBaseline: s.id === "baseline",
  }));

  // Filtered user list for selection
  const filteredUsers = useMemo(() => {
    if (!userQuery.trim()) return dataset.users.slice(0, 12);
    const q = userQuery.toLowerCase();
    return dataset.users
      .filter((u) => u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q))
      .slice(0, 12);
  }, [userQuery, dataset.users]);

  const persona = PERSONA_META[selectedUser.persona];

  return (
    <div className="space-y-4">
      {/* Header banner */}
      <GlassPanel className="border-amber-500/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">Counterfactual Inference Engine</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Using a structural causal model fit from observed ATEs, we estimate what would
              happen to conversion probability if we altered the treatment stack for a specific
              user. Each scenario applies a different combination of treatments, modulated by
              the user's measured responsiveness to each one.
            </p>
          </div>
        </div>
      </GlassPanel>

      {/* User selector + persona */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <GlassPanel title="Selected User" subtitle="Pick a user to run counterfactual scenarios on">
          <Input
            placeholder="Search users…"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            className="mb-3 bg-white/[0.03]"
          />
          <ScrollArea className="h-44 -mx-2">
            <div className="px-2 space-y-1">
              {filteredUsers.map((u) => {
                const meta = PERSONA_META[u.persona];
                const active = u.id === selectedUser.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                      active
                        ? "glass-strong border border-amber-500/40"
                        : "hover:bg-white/[0.03] border border-transparent"
                    }`}
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                      style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}
                    >
                      {meta.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{u.name}</div>
                      <div className="text-[11px] text-muted-foreground">{u.id}</div>
                    </div>
                    {u.converted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </GlassPanel>

        <GlassPanel title="User Profile" subtitle="Behavioral responsiveness">
          <div className="flex items-center gap-3 mb-3">
            <span
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `${persona.color}22`, border: `1px solid ${persona.color}55` }}
            >
              {persona.emoji}
            </span>
            <div>
              <div className="font-semibold">{selectedUser.name}</div>
              <div className="text-xs text-muted-foreground">{persona.name}</div>
            </div>
          </div>
          <div className="space-y-2">
            {TREATMENTS.map((t) => {
              const resp =
                t === "discount"
                  ? selectedUser.features.discountResponse
                  : t === "social_proof"
                  ? selectedUser.features.socialProofResponse
                  : t === "product_reviews"
                  ? selectedUser.features.reviewReliance
                  : selectedUser.features.urgencyResponse;
              const meta = TREATMENT_META[t];
              return (
                <div key={t}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{meta.label}</span>
                    <span className="font-mono">{(resp * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${resp * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ background: meta.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassPanel>
      </div>

      {/* Scenario results chart */}
      <GlassPanel
        title="Counterfactual Scenario Comparison"
        subtitle="Predicted conversion probability for each treatment combination"
        right={
          <StatPill
            label="Winner"
            value={result.winner.label.replace(/^Scenario [A-D]: /, "")}
            color="emerald"
          />
        }
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 40, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.18 0.02 285 / 0.95)",
                  border: "1px solid oklch(1 0 0 / 0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                }}
                formatter={(v: number, _n: string, p: { payload?: { full?: string; uplift?: number } }) => [
                  `${v}%  (uplift ${p?.payload?.uplift?.toFixed(1)}%)`,
                  "Conv. Probability",
                ]}
                labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""}
              />
              <Bar dataKey="probability" radius={[6, 6, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.isWinner
                        ? "#34d399"
                        : d.isBaseline
                        ? "#64748b"
                        : d.isCustom
                        ? "#e879f9"
                        : "#a78bfa"
                    }
                    fillOpacity={d.isWinner ? 1 : 0.7}
                  />
                ))}
                <LabelList
                  dataKey="probability"
                  position="top"
                  formatter={(v: number) => `${v}%`}
                  style={{ fill: "#fff", fontSize: 11, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 mt-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-500" />
            <span className="text-muted-foreground">Baseline</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-violet-400" />
            <span className="text-muted-foreground">Preset scenarios</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-fuchsia-400" />
            <span className="text-muted-foreground">Your custom</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-400" />
            <span className="text-muted-foreground">Winner</span>
          </div>
        </div>
      </GlassPanel>

      {/* Winner card + custom scenario builder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPanel
          title="Recommended Scenario"
          subtitle="Highest predicted conversion probability"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/0 border border-emerald-500/40 p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-emerald-300" />
                  <span className="text-xs uppercase tracking-wider text-emerald-300 font-medium">
                    Winner
                  </span>
                </div>
                <h3 className="text-lg font-semibold">{result.winner.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{result.winner.description}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-emerald-400">
                  {(result.winner.conversionProbability * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-emerald-300">
                  +{result.winner.upliftPct.toFixed(1)}% vs baseline
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-lg bg-black/20 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Est. Revenue
                </div>
                <div className="text-lg font-semibold text-emerald-300">
                  ${result.winner.estimatedRevenue.toFixed(0)}
                </div>
              </div>
              <div className="rounded-lg bg-black/20 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Treatments Applied
                </div>
                <div className="text-sm font-medium">
                  {Object.entries(result.winner.treatments)
                    .filter(([, v]) => v)
                    .map(([k]) => TREATMENT_META[k as TreatmentVariable].label)
                    .join(" + ") || "None"}
                </div>
              </div>
            </div>
          </motion.div>
        </GlassPanel>

        <GlassPanel
          title="Build Your Own Scenario"
          subtitle="Toggle treatments on/off and see live prediction"
          right={
            <button
              onClick={() =>
                setCustomToggles({
                  discount: false,
                  social_proof: false,
                  product_reviews: false,
                  urgency_messaging: false,
                })
              }
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          }
        >
          <div className="space-y-3 mb-4">
            {TREATMENTS.map((t) => {
              const meta = TREATMENT_META[t];
              const value = customToggles[t] ?? false;
              return (
                <div
                  key={t}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5"
                >
                  <div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{meta.description}</div>
                  </div>
                  <Switch
                    checked={value}
                    onCheckedChange={(v) =>
                      setCustomToggles((prev) => ({ ...prev, [t]: v }))
                    }
                  />
                </div>
              );
            })}
          </div>
          <div className="rounded-lg bg-gradient-to-br from-fuchsia-500/15 to-fuchsia-500/0 border border-fuchsia-500/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-fuchsia-300 mb-1">
                  Predicted Conversion
                </div>
                <div className="text-2xl font-bold text-fuchsia-300">
                  {(customScenario.conversionProbability * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  vs Baseline
                </div>
                <div
                  className={`text-lg font-semibold ${
                    customScenario.upliftPct >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {customScenario.upliftPct >= 0 ? "+" : ""}
                  {customScenario.upliftPct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Scenario detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {result.scenarios.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`rounded-xl glass p-4 border ${
                s.id === result.winner.id
                  ? "border-emerald-500/40"
                  : "border-white/5"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {s.id === result.winner.id && (
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span className="text-sm font-semibold">{s.label}</span>
                </div>
                {s.id === result.winner.id && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    WINNER
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">{s.description}</p>
              <div className="space-y-1.5 mb-3">
                {TREATMENTS.map((t) => {
                  const applied = s.treatments[t];
                  const meta = TREATMENT_META[t];
                  return (
                    <div key={t} className="flex items-center gap-2 text-[11px]">
                      <span
                        className={`w-2 h-2 rounded-full ${applied ? "" : "opacity-30"}`}
                        style={{ background: meta.color }}
                      />
                      <span className={applied ? "text-foreground" : "text-muted-foreground line-through"}>
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-end justify-between pt-3 border-t border-white/5">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Conv. Prob.</div>
                  <div className="text-lg font-bold">
                    {(s.conversionProbability * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted-foreground">Uplift</div>
                  <div
                    className={`text-sm font-semibold ${
                      s.upliftPct >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {s.upliftPct >= 0 ? "+" : ""}
                    {s.upliftPct.toFixed(1)}%
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Insight */}
      <GlassPanel className="border-violet-500/30">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/40 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-violet-300" />
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-semibold">Insight: </span>
            For {selectedUser.name.split(" ")[0]}, applying <span className="text-emerald-300">{result.winner.label.replace(/^Scenario [A-D]: /, "")}</span> is
            predicted to yield <span className="text-emerald-300">{result.winner.upliftPct.toFixed(1)}%</span> higher
            conversion vs. the natural baseline. The counterfactual engine used {selectedUser.name.split(" ")[0]}'s
            measured responsiveness to each treatment and the population-level ATEs to estimate this uplift.
            <span className="text-amber-300"> Compare against "Remove Urgency"</span> — this scenario reveals
            what would happen if urgency messaging were stripped, useful for A/B hypothesis generation.
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
