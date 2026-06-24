"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Radio,
  ShoppingCart,
  Eye,
  Search,
  CreditCard,
  TrendingUp,
  Users,
  Zap,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PERSONA_META } from "@/lib/types";

interface LiveEvent {
  id: string;
  userId: string;
  type: string;
  personaKind?: string;
  timestamp: string;
  productId?: string;
  query?: string;
  price?: number;
}

interface LiveStats {
  totalEvents: number;
  uniqueUsers: number;
  conversions: number;
  revenue: number;
  topPersona: string;
  recentEvents: LiveEvent[];
}

const EVENT_ICONS: Record<string, typeof Eye> = {
  page_view: Eye,
  search: Search,
  add_to_cart: ShoppingCart,
  purchase: CreditCard,
  product_click: Eye,
  scroll_depth: TrendingUp,
};

const EVENT_COLORS: Record<string, string> = {
  page_view: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  search: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  add_to_cart: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  purchase: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  product_click: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  scroll_depth: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20",
};

export function LiveDemoMonitorView() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [stats, setStats] = useState<LiveStats>({
    totalEvents: 0,
    uniqueUsers: 0,
    conversions: 0,
    revenue: 0,
    topPersona: "—",
    recentEvents: [],
  });
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchData();

    if (isLive) {
      pollingRef.current = setInterval(fetchData, 5000); // Poll every 5 seconds
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isLive]);

  async function fetchData() {
    try {
      // Fetch recent events
      const eventsRes = await fetch("/api/events?limit=50");
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        const formattedEvents: LiveEvent[] = (data.events ?? []).map((e: any) => ({
          id: e.id,
          userId: e.userId,
          type: e.type,
          timestamp: e.createdAt,
          productId: e.productId,
          query: e.query,
          price: e.price,
        }));

        setEvents((prev) => {
          // Merge new events, avoid duplicates
          const existingIds = new Set(prev.map((e) => e.id));
          const newEvents = formattedEvents.filter((e) => !existingIds.has(e.id));
          return [...newEvents, ...prev].slice(0, 100);
        });
      }

      // Fetch users for stats
      const usersRes = await fetch("/api/users?limit=1");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setStats((prev) => ({
          ...prev,
          totalEvents: events.length,
          uniqueUsers: usersData.pagination?.total ?? prev.uniqueUsers,
        }));
      }
    } catch {
      // Silent fail - keep showing existing data
    }
  }

  function getEventIcon(type: string) {
    const Icon = EVENT_ICONS[type] ?? Activity;
    return Icon;
  }

  function getTimeSince(timestamp: string) {
    const diff = Date.now() - new Date(timestamp).getTime();
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  }

  return (
    <div className="space-y-6">
      {/* Live Status Bar */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isLive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
            }`}
          />
          <span className="text-sm font-medium">{isLive ? "Live" : "Paused"}</span>
        </div>
        <button
          onClick={() => setIsLive(!isLive)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isLive
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Radio className="w-3 h-3" />
          {isLive ? "Monitoring" : "Start Monitoring"}
        </button>
        <button
          onClick={() => { setLoading(true); fetchData().finally(() => setLoading(false)); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border hover:bg-muted transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Events Tracked", value: events.length, icon: Activity, color: "text-blue-500" },
          { label: "Unique Users", value: stats.uniqueUsers, icon: Users, color: "text-violet-500" },
          {
            label: "Conversions",
            value: events.filter((e) => e.type === "purchase").length,
            icon: CreditCard,
            color: "text-emerald-500",
          },
          {
            label: "Revenue",
            value: `$${events
              .filter((e) => e.type === "purchase")
              .reduce((sum, e) => sum + (e.price ?? 0), 0)
              .toFixed(2)}`,
            icon: TrendingUp,
            color: "text-amber-500",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="border rounded-xl p-4 bg-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-xl font-bold">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Event Activity Feed */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold">Live Activity Feed</span>
          {isLive && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Auto-refreshing
            </span>
          )}
        </div>

        <div className="divide-y max-h-[500px] overflow-y-auto">
          {events.length === 0 && (
            <div className="p-8 text-center">
              <Activity className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No events yet. Connect the Bazaar demo store or send events to{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/events/public</code>
              </p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {events.slice(0, 50).map((event) => {
              const Icon = getEventIcon(event.type);
              const colorClass = EVENT_COLORS[event.type] ?? "bg-muted text-muted-foreground";

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorClass} border`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {event.type.replace(/_/g, " ")}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                      <span>User: {event.userId.slice(0, 8)}...</span>
                      {event.productId && <span>· Product: {event.productId}</span>}
                      {event.query && <span>· Query: &ldquo;{event.query}&rdquo;</span>}
                      {event.price && <span>· ${event.price.toFixed(2)}</span>}
                    </div>
                  </div>
                  {event.personaKind && (
                    <Badge variant="outline" className="text-[9px] shrink-0">
                      {(PERSONA_META as any)[event.personaKind]?.emoji ?? "🎯"}{" "}
                      {(PERSONA_META as any)[event.personaKind]?.name ?? event.personaKind}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {event.timestamp ? getTimeSince(event.timestamp) : "now"}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
