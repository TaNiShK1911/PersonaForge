"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useForgeStore } from "@/lib/store";
import { ARM_META, BanditArm, BANDIT_ARMS } from "@/lib/types";
import { GlassPanel, StatPill } from "@/components/personaforge/primitives";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { Dices, Play, RotateCcw, FastForward, Trophy, Activity } from "lucide-react";

export function BanditOptimizerView() {
  const bandit = useForgeStore((s) => s.bandit);
  const stepBanditOnce = useForgeStore((s) => s.stepBanditOnce);
  const stepBanditMany = useForgeStore((s) => s.stepBanditMany);
  const resetBandit = useForgeStore((s) => s.resetBandit);

  // Cumulative reward + regret over time
  const history = bandit.history;
  const chartData = history.map((h) => ({
    round: h.round,
    cumulativeReward: +h.cumulativeReward.toFixed(2),
    cumulativeOptimal: +h.cumulativeOptimal.toFixed(2),
    regret: +h.regret.toFixed(2),
    chosen: h.chosen,
  }));

  // Arm pull distribution
  const armPulls = BANDIT_ARMS.map((a) => ({
    arm: a,
    label: ARM_META[a].label,
    pulls: bandit.arms[a].pulls,
    rate: bandit.arms[a].observedRate,
    alpha: bandit.arms[a].alpha,
    beta: bandit.arms[a].beta,
    expectedValue: bandit.arms[a].expectedValue,
    color: ARM_META[a].color,
  }));

  // Beta posterior samples for visualization (PDF curve)
  const betaCurves = useMemo(() => {
    const xs = Array.from({ length: 60 }, (_, i) => i / 60);
    return BANDIT_ARMS.map((a) => {
      const arm = bandit.arms[a];
      const points = xs.map((x) => ({
        x: +x.toFixed(3),
        density: betaPdf(x, arm.alpha, arm.beta),
        arm: a,
      }));
      return { arm: a, color: ARM_META[a].color, points };
    });
  }, [bandit]);

  const totalPulls = armPulls.reduce((s, a) => s + a.pulls, 0);
  const bestArm = bandit.bestArm;
  const bestMeta = ARM_META[bestArm];

  return (
    <div className="space-y-4">
      {/* Header banner */}
      <GlassPanel className="border-sky-500/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/15 border border-sky-500/40 flex items-center justify-center shrink-0">
            <Dices className="w-5 h-5 text-sky-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">
              Thompson Sampling Multi-Armed Bandit
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Three messaging variants compete for conversion. Each arm maintains a Beta(α, β)
              posterior updated on every pull. On each round we sample from each posterior and
              pick the highest — automatically balancing exploration (sampling wide posteriors)
              against exploitation (sampling tight, high-rate posteriors).
            </p>
          </div>
          <div className="hidden md:flex gap-2">
            <button
              onClick={() => stepBanditOnce()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-200 text-xs font-medium hover:bg-sky-500/25 transition-colors"
            >
              <Play className="w-3 h-3" /> Step
            </button>
            <button
              onClick={() => stepBanditMany(50)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/40 text-violet-200 text-xs font-medium hover:bg-violet-500/25 transition-colors"
            >
              <FastForward className="w-3 h-3" /> +50
            </button>
            <button
              onClick={() => resetBandit()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-medium hover:bg-rose-500/25 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>
      </GlassPanel>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Rounds"
          value={bandit.totalRounds}
          color="violet"
          delay={0}
        />
        <StatCard
          label="Cumulative Reward"
          value={bandit.history.reduce((s, h) => s + h.reward, 0)}
          color="emerald"
          delay={0.06}
        />
        <StatCard
          label="Cumulative Regret"
          value={bandit.history.length > 0 ? bandit.history[bandit.history.length - 1].regret.toFixed(2) : "0"}
          color="rose"
          delay={0.12}
        />
        <StatCard
          label="Best Arm Conversion Improvement"
          value={`+${bandit.conversionImprovement.toFixed(1)}%`}
          color="amber"
          delay={0.18}
        />
      </div>

      {/* Best arm highlight */}
      <GlassPanel className="border-emerald-500/30">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{
              background: `${bestMeta.color}22`,
              border: `1px solid ${bestMeta.color}55`,
            }}
          >
            <Trophy className="w-6 h-6 text-emerald-300" />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-emerald-300 font-medium">
              Current Winner (highest observed rate)
            </div>
            <div className="text-xl font-semibold">{bestMeta.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {bestMeta.description}
            </div>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Observed Rate
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {(bandit.arms[bestArm].observedRate * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Pulls
              </div>
              <div className="text-2xl font-bold">
                {bandit.arms[bestArm].pulls}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Posterior
              </div>
              <div className="text-base font-mono">
                β({bandit.arms[bestArm].alpha.toFixed(0)}, {bandit.arms[bestArm].beta.toFixed(0)})
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Regret chart */}
      <GlassPanel
        title="Cumulative Reward vs. Optimal"
        subtitle="Total rewards earned vs. what an oracle would have earned always pulling the best arm"
        right={
          <div className="flex items-center gap-2">
            <StatPill
              label="Exploration"
              value={`${(bandit.explorationRate * 100).toFixed(0)}%`}
              color="amber"
            />
            <StatPill
              label="Exploitation"
              value={`${(bandit.exploitationRate * 100).toFixed(0)}%`}
              color="emerald"
            />
          </div>
        }
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="rewardGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="optimalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="round" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.18 0.02 285 / 0.95)",
                  border: "1px solid oklch(1 0 0 / 0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulativeOptimal"
                stroke="#a78bfa"
                strokeWidth={2}
                fill="url(#optimalGrad)"
                name="Optimal (oracle)"
              />
              <Area
                type="monotone"
                dataKey="cumulativeReward"
                stroke="#34d399"
                strokeWidth={2}
                fill="url(#rewardGrad)"
                name="Bandit reward"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>

      {/* Beta posteriors + arm pulls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Beta posterior curves */}
        <GlassPanel
          title="Beta Posterior Distributions"
          subtitle="Live posterior over each arm's true conversion rate"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[0, 1]}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.02 285 / 0.95)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(v: number, _n: string, p: { payload?: { arm?: BanditArm } }) => [
                    v.toFixed(3),
                    p?.payload?.arm ?? "",
                  ]}
                  labelFormatter={(v) => `Conversion rate: ${(Number(v) * 100).toFixed(1)}%`}
                />
                {betaCurves.map((c) => (
                  <Line
                    key={c.arm}
                    data={c.points}
                    dataKey="density"
                    stroke={c.color}
                    strokeWidth={2}
                    dot={false}
                    type="monotone"
                    name={ARM_META[c.arm].label}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {BANDIT_ARMS.map((a) => {
              const meta = ARM_META[a];
              const arm = bandit.arms[a];
              return (
                <div
                  key={a}
                  className="rounded-lg p-2.5 border text-xs"
                  style={{ borderColor: `${meta.color}33`, background: `${meta.color}08` }}
                >
                  <div className="font-semibold" style={{ color: meta.color }}>
                    {meta.label.split(" ")[0]}
                  </div>
                  <div className="text-muted-foreground mt-0.5">β({arm.alpha.toFixed(0)}, {arm.beta.toFixed(0)})</div>
                  <div className="mt-1 font-mono">
                    μ = {(arm.alpha / (arm.alpha + arm.beta) * 100).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </GlassPanel>

        {/* Arm pulls + observed rates */}
        <GlassPanel
          title="Arm Pull Distribution"
          subtitle="How many times each arm has been pulled + observed conversion rate"
        >
          <div className="space-y-3">
            {armPulls.map((a) => {
              const pct = totalPulls > 0 ? (a.pulls / totalPulls) * 100 : 0;
              const isBest = a.arm === bestArm;
              return (
                <motion.div
                  key={a.arm}
                  layout
                  className={`rounded-lg p-3 border ${
                    isBest ? "border-emerald-500/40" : "border-white/5"
                  } bg-white/[0.02]`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: a.color }}
                      />
                      <span className="text-sm font-medium">{a.label}</span>
                      {isBest && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                          BEST
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {a.pulls} pulls ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-2">
                    <motion.div
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full rounded-full"
                      style={{ background: a.color }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Observed: <span className="font-mono text-foreground">{(a.rate * 100).toFixed(1)}%</span>
                    </span>
                    <span className="text-muted-foreground">
                      Sampled θ: <span className="font-mono" style={{ color: a.color }}>{a.expectedValue.toFixed(3)}</span>
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </GlassPanel>
      </div>

      {/* Recent pulls */}
      <GlassPanel
        title="Recent Pulls"
        subtitle="Last 20 decisions made by the bandit"
        right={<Activity className="w-4 h-4 text-sky-300" />}
      >
        <div className="flex flex-wrap gap-1.5">
          {history.slice(-20).map((h, i) => {
            const meta = ARM_META[h.chosen];
            return (
              <motion.div
                key={h.round}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-mono"
                style={{
                  background: `${meta.color}11`,
                  borderColor: `${meta.color}44`,
                }}
                title={`Round ${h.round}: ${meta.label} → ${h.reward ? "Success" : "Fail"}`}
              >
                <span style={{ color: meta.color }}>
                  {meta.label.split(" ")[0]}
                </span>
                <span className={h.reward ? "text-emerald-600 font-medium ml-1" : "text-muted-foreground ml-1"}>
                  {h.reward ? "Success" : "Fail"}
                </span>
              </motion.div>
            );
          })}
        </div>
      </GlassPanel>

      <GlassPanel className="border-sky-500/30">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/40 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-sky-300" />
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-semibold">How it works: </span>
            On every round, each arm's Beta posterior is sampled — early on, posteriors are wide
            and the bandit explores freely. As rewards accumulate, posteriors sharpen around the
            true rate and the bandit increasingly exploits the best arm. The{" "}
            <span className="text-amber-300">exploration rate</span> is the fraction of recent
            pulls that did <em>not</em> go to the currently-best arm; you'll see it decline over
            time as the algorithm converges. The{" "}
            <span className="text-emerald-300">conversion improvement</span> measures how much
            better the best arm's observed rate is than the average of the others — the
            operational lift the bandit has unlocked.
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: string | number;
  color: "violet" | "emerald" | "rose" | "amber";
  delay: number;
}) {
  const colors = {
    violet: "bg-white border-violet-200",
    emerald: "bg-white border-emerald-200",
    rose: "bg-white border-rose-200",
    amber: "bg-white border-amber-200",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`card-base p-5 border-t-4 border-t-${color}-500`}
    >
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className="text-2xl md:text-3xl font-semibold mt-2">{value}</div>
    </motion.div>
  );
}

// Beta PDF — for visualization only
function betaPdf(x: number, alpha: number, beta: number): number {
  if (x <= 0 || x >= 1) return 0;
  const logB = logBeta(alpha, beta);
  const logPdf =
    (alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - logB;
  return Math.exp(logPdf);
}

function logGamma(z: number): number {
  // Lanczos approximation
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}
