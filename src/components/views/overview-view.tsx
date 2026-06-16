"use client";

import { motion } from "framer-motion";
import {
  Users,
  Target,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useForgeStore } from "@/lib/store";
import { PERSONA_META, PERSONA_KINDS } from "@/lib/types";
import { KpiCard, GlassPanel, StatPill } from "@/components/personaforge/primitives";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts";

export function OverviewView() {
  const dataset = useForgeStore((s) => s.dataset);
  const personas = useForgeStore((s) => s.personas);
  const causalEffects = useForgeStore((s) => s.causalEffects);

  const totalUsers = dataset.users.length;
  const converted = dataset.users.filter((u) => u.converted).length;
  const conversionRate = (converted / totalUsers) * 100;
  const revenue = dataset.users.reduce((s, u) => s + u.revenue, 0);
  const avgOrder = revenue / Math.max(1, converted);
  const activeUsers = dataset.users.filter((u) => u.events.length > 5).length;

  // 7-day revenue trend (synthesized from events)
  const now = Date.now();
  const days = Array.from({ length: 14 }, (_, i) => {
    const dayStart = now - (13 - i) * 24 * 3600_000;
    const dayEnd = dayStart + 24 * 3600_000;
    const dayPurchases = dataset.events.filter(
      (e) => e.type === "purchase" && e.timestamp >= dayStart && e.timestamp < dayEnd
    );
    const dayRevenue = dayPurchases.reduce((s, e) => s + (e.price ?? 0), 0);
    return {
      day: new Date(dayStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: dayRevenue,
      conversions: dayPurchases.length,
    };
  });

  // Persona distribution
  const personaDist = PERSONA_KINDS.map((k) => {
    const count = dataset.users.filter((u) => u.persona === k).length;
    return {
      name: PERSONA_META[k].name,
      value: count,
      color: PERSONA_META[k].color,
      kind: k,
    };
  });

  // Funnel data
  const funnel = [
    { stage: "Awareness", users: totalUsers, pct: 100 },
    {
      stage: "Interest",
      users: dataset.users.filter((u) =>
        u.events.some((e) => e.type === "search" || e.type === "product_click")
      ).length,
      pct: 0,
    },
    {
      stage: "Consideration",
      users: dataset.users.filter((u) =>
        u.events.some((e) => e.type === "add_to_cart" || e.type === "wishlist")
      ).length,
      pct: 0,
    },
    {
      stage: "Intent",
      users: dataset.users.filter((u) =>
        u.events.filter((e) => e.type === "add_to_cart").length >= 2
      ).length,
      pct: 0,
    },
    { stage: "Purchase", users: converted, pct: 0 },
  ];
  funnel.forEach((f, i) => {
    f.pct = i === 0 ? 100 : (f.users / totalUsers) * 100;
  });

  // Revenue impact by treatment (top 4)
  const revImpact = causalEffects.map((e) => ({
    name: e.treatment.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    ate: +(e.ate * 100).toFixed(2),
    ci_lower: +(e.ci_lower * 100).toFixed(2),
    ci_upper: +(e.ci_upper * 100).toFixed(2),
    color:
      e.treatment === "discount"
        ? "#34d399"
        : e.treatment === "social_proof"
        ? "#22d3ee"
        : e.treatment === "product_reviews"
        ? "#fbbf24"
        : "#fb7185",
  }));

  // Radial: conversion rate
  const radialData = [{ name: "Conversion", value: conversionRate, fill: "#a78bfa" }];

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Users"
          value={activeUsers.toLocaleString()}
          delta="+12.4% vs last week"
          deltaTrend="up"
          icon={<Users className="w-4 h-4" />}
          accent="violet"
          delay={0}
        />
        <KpiCard
          label="Conversion Rate"
          value={`${conversionRate.toFixed(1)}%`}
          delta="+1.8pp from causal optimization"
          deltaTrend="up"
          icon={<Target className="w-4 h-4" />}
          accent="emerald"
          delay={0.06}
        />
        <KpiCard
          label="Revenue Impact"
          value={`$${(revenue / 1000).toFixed(1)}K`}
          delta="+$8.2K from bandit optimization"
          deltaTrend="up"
          icon={<DollarSign className="w-4 h-4" />}
          accent="amber"
          delay={0.12}
        />
        <KpiCard
          label="Avg Order Value"
          value={`$${avgOrder.toFixed(0)}`}
          delta="-2.1% (luxury segment cooling)"
          deltaTrend="down"
          icon={<TrendingUp className="w-4 h-4" />}
          accent="fuchsia"
          delay={0.18}
        />
      </div>

      {/* Revenue Trend + Persona Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassPanel
          title="Revenue & Conversions — Last 14 Days"
          subtitle="Daily revenue (area) and conversion count (line)"
          className="lg:col-span-2"
          right={
            <div className="flex items-center gap-2">
              <StatPill label="Revenue" value={`$${(revenue / 1000).toFixed(1)}K`} color="amber" />
              <StatPill label="Conv" value={converted} color="violet" />
            </div>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={days} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e879f9" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#e879f9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
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
                  dataKey="revenue"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  fill="url(#revGrad)"
                  name="Revenue ($)"
                />
                <Area
                  type="monotone"
                  dataKey="conversions"
                  stroke="#e879f9"
                  strokeWidth={2}
                  fill="url(#convGrad)"
                  name="Conversions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel
          title="Persona Distribution"
          subtitle="Active users across 6 micro-personas"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={personaDist}
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {personaDist.map((p, i) => (
                    <Cell key={i} fill={p.color} stroke="oklch(0.18 0.02 285)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.02 285 / 0.95)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {personaDist.map((p) => (
              <div key={p.kind} className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                <span className="text-muted-foreground truncate flex-1">{p.name}</span>
                <span className="font-semibold">{p.value}</span>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      {/* Funnel + Causal Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassPanel
          title="Conversion Funnel"
          subtitle="Stage drop-off across the user journey"
          className="lg:col-span-2"
        >
          <div className="space-y-3 pt-1">
            {funnel.map((f, i) => {
              const dropOff = i === 0 ? 0 : ((funnel[i - 1].users - f.users) / funnel[i - 1].users) * 100;
              return (
                <motion.div
                  key={f.stage}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.3 }}
                  className="relative"
                >
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="font-medium">{f.stage}</span>
                    <span className="text-muted-foreground">
                      {f.users.toLocaleString()} users · {f.pct.toFixed(1)}%
                      {i > 0 && dropOff > 0 && (
                        <span className="ml-2 text-rose-400">
                          <ArrowDownRight className="inline w-3 h-3" />
                          {dropOff.toFixed(1)}% drop
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-7 rounded-md bg-white/[0.03] overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${f.pct}%` }}
                      transition={{ delay: i * 0.07 + 0.2, duration: 0.5, ease: "easeOut" }}
                      className="h-full rounded-md relative"
                      style={{
                        background: `linear-gradient(90deg, oklch(0.62 0.22 295), oklch(0.65 0.25 330))`,
                      }}
                    >
                      <div className="absolute inset-0 grid-bg opacity-30" />
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </GlassPanel>

        <GlassPanel
          title="Causal Revenue Impact"
          subtitle="ATE × conversion volume by treatment"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revImpact} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.02 285 / 0.95)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(v: number) => [`${v.toFixed(2)}pp`, "ATE"]}
                />
                <Bar dataKey="ate" radius={[0, 6, 6, 0]}>
                  {revImpact.map((r, i) => (
                    <Cell key={i} fill={r.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">
            Top driver:{" "}
            <span className="text-foreground font-semibold">
              {revImpact[0]?.name}
            </span>{" "}
            with +{revImpact[0]?.ate.toFixed(2)}pp ATE
          </div>
        </GlassPanel>
      </div>

      {/* Persona table */}
      <GlassPanel
        title="Persona Performance Snapshot"
        subtitle="Conversion rate and revenue by detected micro-persona"
      >
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-white/5">
                <th className="text-left font-medium py-2 px-2">Persona</th>
                <th className="text-right font-medium py-2 px-2">Members</th>
                <th className="text-right font-medium py-2 px-2">Conv. Rate</th>
                <th className="text-right font-medium py-2 px-2">Avg Revenue</th>
                <th className="text-right font-medium py-2 px-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {personas.map((p, i) => {
                const meta = PERSONA_META[p.kind];
                return (
                  <motion.tr
                    key={p.kind}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-7 h-7 rounded-md flex items-center justify-center text-sm"
                          style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}
                        >
                          {meta.emoji}
                        </span>
                        <div>
                          <div className="font-medium">{p.persona_name}</div>
                          <div className="text-[11px] text-muted-foreground">{meta.tagline}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2 font-mono">{p.memberCount.toLocaleString()}</td>
                    <td className="text-right py-3 px-2">
                      <span className="font-mono text-emerald-400">
                        {(p.avgConversion * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-2 font-mono">${p.avgRevenue.toFixed(0)}</td>
                    <td className="text-right py-3 px-2">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${p.confidence * 100}%`,
                              background: meta.color,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {(p.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
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
