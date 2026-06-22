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
  violet: "bg-white border-violet-200",
  fuchsia: "bg-white border-fuchsia-200",
  emerald: "bg-white border-emerald-200",
  amber: "bg-white border-amber-200",
  rose: "bg-white border-rose-200",
  cyan: "bg-white border-cyan-200",
};

const TREND_COLORS = {
  up: "text-emerald-600",
  down: "text-rose-600",
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
        "relative overflow-hidden p-5 card-base",
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
    <div className={cn("card-base p-5", className)}>
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
    violet: "bg-violet-100 text-violet-700 border-violet-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rose: "bg-rose-100 text-rose-700 border-rose-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    cyan: "bg-cyan-100 text-cyan-700 border-cyan-200",
    fuchsia: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
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
