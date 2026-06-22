"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Eye,
  MousePointerClick,
  ShoppingCart,
  Heart,
  ScrollText,
  Clock,
  LogOut,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import { useForgeStore } from "@/lib/store";
import { PERSONA_META, BehaviorEvent, EventType, INTENT_STAGES, IntentStage } from "@/lib/types";
import { predictIntent } from "@/lib/ml/intent";
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
} from "recharts";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const EVENT_META: Record<EventType, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; label: string }> = {
  page_view: { icon: Eye, color: "#a78bfa", label: "Page View" },
  scroll_depth: { icon: ScrollText, color: "#22d3ee", label: "Scroll" },
  search: { icon: Search, color: "#34d399", label: "Search" },
  product_click: { icon: MousePointerClick, color: "#fbbf24", label: "Product Click" },
  add_to_cart: { icon: ShoppingCart, color: "#e879f9", label: "Add to Cart" },
  wishlist: { icon: Heart, color: "#fb7185", label: "Wishlist" },
  purchase: { icon: DollarSign, color: "#34d399", label: "Purchase" },
  time_on_page: { icon: Clock, color: "#94a3b8", label: "Dwell" },
  exit: { icon: LogOut, color: "#64748b", label: "Exit" },
};

const STAGE_COLORS: Record<IntentStage, string> = {
  awareness: "#94a3b8",
  interest: "#22d3ee",
  consideration: "#a78bfa",
  intent: "#fbbf24",
  purchase: "#34d399",
};

export function UserExplorerView() {
  const dataset = useForgeStore((s) => s.dataset);
  const selectedUserId = useForgeStore((s) => s.selectedUserId);
  const selectUser = useForgeStore((s) => s.selectUser);
  const [query, setQuery] = useState("");

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return dataset.users.slice(0, 50);
    const q = query.toLowerCase();
    return dataset.users
      .filter((u) => u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q))
      .slice(0, 50);
  }, [query, dataset.users]);

  const selectedUser = dataset.users.find((u) => u.id === selectedUserId) ?? dataset.users[0];
  const intent = useMemo(
    () => (selectedUser ? predictIntent(selectedUser.events) : null),
    [selectedUser]
  );

  if (!selectedUser || !intent) return null;

  const persona = PERSONA_META[selectedUser.persona];
  const events = selectedUser.events.slice(0, 60);

  // Intent trajectory chart data
  const trajectoryData = intent.trajectory.map((t, i) => ({
    round: i + 1,
    stage: t.stage,
    stageIdx: INTENT_STAGES.indexOf(t.stage),
    confidence: +(t.confidence * 100).toFixed(1),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      {/* User list */}
      <GlassPanel title="Select User" subtitle={`${filteredUsers.length} of ${dataset.users.length} users`}>
        <Input
          placeholder="Search by name or ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-3 bg-white/[0.03]"
        />
        <ScrollArea className="h-[640px] -mx-2 pr-1">
          <div className="px-2 space-y-1">
            {filteredUsers.map((u) => {
              const meta = PERSONA_META[u.persona];
              const active = u.id === selectedUser.id;
              return (
                <button
                  key={u.id}
                  onClick={() => selectUser(u.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                    active
                      ? "glass-strong border border-violet-500/40"
                      : "hover:bg-white/[0.03] border border-transparent"
                  )}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                    style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}
                  >
                    {meta.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {u.id} · {u.events.length} events
                    </div>
                  </div>
                  {u.converted && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  )}
                  {active && <ChevronRight className="w-4 h-4 text-violet-300 shrink-0" />}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </GlassPanel>

      {/* Detail panel */}
      <div className="space-y-4">
        {/* User header */}
        <GlassPanel>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <span
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: `${persona.color}22`, border: `1px solid ${persona.color}55` }}
            >
              {persona.emoji}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">{selectedUser.name}</h2>
                <StatPill label="Persona" value={persona.name} color="violet" />
                {selectedUser.converted && (
                  <StatPill label="Status" value="Converted" color="emerald" />
                )}
                <StatPill 
                  label="Consent" 
                  value={(selectedUser.consentLevel ?? "full").toUpperCase()} 
                  color={
                    selectedUser.consentLevel === "none" ? "red" :
                    selectedUser.consentLevel === "basic" ? "amber" : 
                    "emerald"
                  } 
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {selectedUser.email} · {selectedUser.sessions} sessions ·{" "}
                {selectedUser.events.length} events · ${selectedUser.revenue} revenue
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-center">
                <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                  Current Stage
                </div>
                <div
                  className="text-lg font-semibold capitalize"
                  style={{ color: STAGE_COLORS[intent.current_stage] }}
                >
                  {intent.current_stage}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                  Confidence
                </div>
                <div className="text-lg font-semibold">
                  {(intent.confidence_score * 100).toFixed(0)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                  Predicted Next
                </div>
                <div
                  className="text-lg font-semibold capitalize"
                  style={{ color: STAGE_COLORS[intent.predicted_next_stage] }}
                >
                  {intent.predicted_next_stage}
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Intent trajectory */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassPanel
            title="Intent Trajectory Model"
            subtitle="LSTM-style sequence model over the user's events"
            className="lg:col-span-2"
          >
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trajectoryData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="round" tickLine={false} axisLine={false} label={{ value: "Journey step", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: "#94a3b8" } }} />
                  <YAxis
                    domain={[0, 4]}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => INTENT_STAGES[v] ?? ""}
                    ticks={[0, 1, 2, 3, 4]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.18 0.02 285 / 0.95)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                    formatter={(_v: number, _n: string, p: { payload?: { stage?: string; confidence?: number } }) => [
                      p?.payload?.stage ?? "",
                      `Stage (${(p?.payload?.confidence ?? 0).toFixed(0)}% conf.)`,
                    ]}
                  />
                  {INTENT_STAGES.map((s, i) => (
                    <ReferenceLine
                      key={s}
                      y={i}
                      stroke={STAGE_COLORS[s]}
                      strokeOpacity={0.2}
                      strokeDasharray="4 4"
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="stageIdx"
                    stroke="#a78bfa"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#a78bfa", stroke: "#fff", strokeWidth: 1 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {INTENT_STAGES.map((s) => (
                <div key={s} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ background: STAGE_COLORS[s] }} />
                  <span className="text-muted-foreground capitalize">{s}</span>
                  <span className="font-mono">
                    {(intent.stageProbabilities[s] * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel
            title="Behavioral Features"
            subtitle="Aggregated from event stream"
          >
            <div className="space-y-2.5">
              {[
                { label: "Price Sensitivity", value: selectedUser.features.priceSensitivity, color: "#34d399" },
                { label: "Brand Affinity", value: selectedUser.features.brandAffinity, color: "#a78bfa" },
                { label: "Discount Response", value: selectedUser.features.discountResponse, color: "#fbbf24" },
                { label: "Urgency Response", value: selectedUser.features.urgencyResponse, color: "#fb7185" },
                { label: "Social Proof", value: selectedUser.features.socialProofResponse, color: "#22d3ee" },
                { label: "Review Reliance", value: selectedUser.features.reviewReliance, color: "#94a3b8" },
                { label: "Trend Affinity", value: selectedUser.features.trendAffinity, color: "#e879f9" },
              ].map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-mono">{(f.value * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${f.value * 100}%` }}
                      transition={{ delay: i * 0.05 + 0.1, duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ background: f.color }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassPanel>
        </div>

        {/* Event timeline */}
        <GlassPanel
          title="Event Timeline"
          subtitle={`Most recent ${events.length} events from ${selectedUser.events.length} total`}
        >
          <ScrollArea className="h-[480px] -mx-2">
            <div className="px-2 relative">
              <div className="absolute left-[31px] top-2 bottom-2 w-px bg-white/10" />
              {events.map((ev, i) => (
                <EventRow key={ev.id} event={ev} index={i} />
              ))}
            </div>
          </ScrollArea>
        </GlassPanel>
      </div>
    </div>
  );
}

function EventRow({ event, index }: { event: BehaviorEvent; index: number }) {
  const meta = EVENT_META[event.type];
  const Icon = meta.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.4), duration: 0.25 }}
      className="flex items-start gap-3 py-2 relative"
    >
      <div
        className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
        style={{
          background: `${meta.color}22`,
          borderColor: `${meta.color}55`,
        }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{meta.label}</span>
          <span className="text-[11px] text-muted-foreground font-mono">
            {new Date(event.timestamp).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
          <span className="text-[10px] text-muted-foreground bg-white/[0.04] px-1.5 py-0.5 rounded">
            depth {event.pageDepth}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {event.productId && <span>Product: <span className="text-foreground/80">{event.productId}</span> · </span>}
          {event.query && <span>Query: <span className="text-foreground/80">"{event.query}"</span> · </span>}
          {event.scrollPct !== undefined && <span>Scroll: <span className="text-foreground/80">{event.scrollPct}%</span> · </span>}
          {event.dwellSec !== undefined && <span>Dwell: <span className="text-foreground/80">{event.dwellSec}s</span> · </span>}
          {event.price !== undefined && <span>Price: <span className="text-foreground/80">${event.price}</span> · </span>}
          {event.discountSeen && <span className="text-emerald-400">🏷️ discount </span>}
          {event.socialProofSeen && <span className="text-cyan-400">👥 social-proof </span>}
          {event.reviewSeen && <span className="text-amber-400">⭐ review </span>}
          {event.urgencySeen && <span className="text-rose-400">⏰ urgency </span>}
        </div>
      </div>
    </motion.div>
  );
}
