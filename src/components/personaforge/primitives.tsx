"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaTrend?: "up" | "down" | "flat";
  icon?: ReactNode;
  accent?: "violet" | "fuchsia" | "emerald" | "amber" | "rose" | "cyan";
  delay?: number;
}

const ACCENTS: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  violet: "from-violet-500/15 to-violet-500/0 border-violet-500/30",
  fuchsia: "from-fuchsia-500/15 to-fuchsia-500/0 border-fuchsia-500/30",
  emerald: "from-emerald-500/15 to-emerald-500/0 border-emerald-500/30",
  amber: "from-amber-500/15 to-amber-500/0 border-amber-500/30",
  rose: "from-rose-500/15 to-rose-500/0 border-rose-500/30",
  cyan: "from-cyan-500/15 to-cyan-500/0 border-cyan-500/30",
};

const TREND_COLORS = {
  up: "text-emerald-400",
  down: "text-rose-400",
  flat: "text-muted-foreground",
};

export function KpiCard({
  label,
  value,
  delta,
  deltaTrend = "flat",
  icon,
  accent = "violet",
  delay = 0,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cn(
        "relative overflow-hidden rounded-xl p-5 glass border bg-gradient-to-br",
        ACCENTS[accent]
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.15, duration: 0.5 }}
        className="text-2xl md:text-3xl font-semibold tracking-tight"
      >
        {value}
      </motion.div>
      {delta && (
        <div className={cn("text-xs mt-1.5 font-medium", TREND_COLORS[deltaTrend])}>
          {delta}
        </div>
      )}
    </motion.div>
  );
}

export function GlassPanel({
  className,
  children,
  title,
  subtitle,
  right,
}: {
  className?: string;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl glass p-5", className)}>
      {(title || right) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatPill({
  label,
  value,
  color = "violet",
}: {
  label: string;
  value: string | number;
  color?: "violet" | "emerald" | "rose" | "amber" | "cyan" | "fuchsia";
}) {
  const colors = {
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    fuchsia: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium",
        colors[color]
      )}
    >
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
