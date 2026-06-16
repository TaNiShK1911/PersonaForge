"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Boxes,
  GitBranch,
  FlaskConical,
  Sparkles,
  MessageSquareText,
  Dices,
  Zap,
  Activity,
  Github,
} from "lucide-react";
import { useForgeStore, ViewId } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const NAV: {
  id: ViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
  accent: string;
}[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    hint: "KPIs & funnel",
    accent: "from-violet-500/20 to-violet-500/0",
  },
  {
    id: "users",
    label: "User Explorer",
    icon: Users,
    hint: "Event timeline",
    accent: "from-cyan-500/20 to-cyan-500/0",
  },
  {
    id: "personas",
    label: "Persona Studio",
    icon: Boxes,
    hint: "Clusters & embeddings",
    accent: "from-fuchsia-500/20 to-fuchsia-500/0",
  },
  {
    id: "causal",
    label: "Causal Analysis",
    icon: GitBranch,
    hint: "ATE & causal graph",
    accent: "from-emerald-500/20 to-emerald-500/0",
  },
  {
    id: "counterfactual",
    label: "Counterfactual Lab",
    icon: FlaskConical,
    hint: "What-if simulator",
    accent: "from-amber-500/20 to-amber-500/0",
  },
  {
    id: "personalization",
    label: "Personalization",
    icon: Sparkles,
    hint: "Ads · emails · push",
    accent: "from-rose-500/20 to-rose-500/0",
  },
  {
    id: "explainability",
    label: "Explainability",
    icon: MessageSquareText,
    hint: "Plain-English reasons",
    accent: "from-lime-500/20 to-lime-500/0",
  },
  {
    id: "bandit",
    label: "Bandit Optimizer",
    icon: Dices,
    hint: "Thompson Sampling",
    accent: "from-sky-500/20 to-sky-500/0",
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const currentView = useForgeStore((s) => s.currentView);
  const setView = useForgeStore((s) => s.setView);
  const dataset = useForgeStore((s) => s.dataset);

  const current = NAV.find((n) => n.id === currentView)!;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 glass-strong border-b border-white/5">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center glow-violet">
              <Zap className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <div className="text-sm font-semibold leading-tight">
                Persona<span className="gradient-text">Forge</span>
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                Causal Micro-Persona Engine
              </div>
            </div>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex ml-2 px-2 py-0 text-[10px] border-violet-500/40 text-violet-300"
            >
              <Activity className="w-3 h-3 mr-1" />
              MVP
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                <span className="text-foreground font-semibold">
                  {dataset.users.length.toLocaleString()}
                </span>{" "}
                users
              </span>
              <span>
                <span className="text-foreground font-semibold">
                  {dataset.events.length.toLocaleString()}
                </span>{" "}
                events
              </span>
              <span>
                <span className="text-foreground font-semibold">6</span> personas
              </span>
            </div>
            <a
              href="#"
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              <Github className="w-3.5 h-3.5" />
              Repo
            </a>
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-white/5 glass sticky top-14 self-start h-[calc(100vh-3.5rem)]">
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {NAV.map((item) => {
              const active = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={cn(
                    "group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                    active
                      ? "glass-strong text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-500/15 to-fuchsia-500/5 border border-violet-500/30"
                      transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative w-4 h-4 shrink-0",
                      active ? "text-violet-300" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span className="relative flex-1 text-left font-medium">
                    {item.label}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="nav-dot"
                      className="relative w-1.5 h-1.5 rounded-full bg-violet-400"
                    />
                  )}
                </button>
              );
            })}
          </nav>
          <div className="p-3 border-t border-white/5">
            <div className="glass rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Live ML Pipeline
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs text-foreground">Healthy</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Updated {new Date(dataset.generatedAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-white/5">
          <div className="flex overflow-x-auto px-1 py-1 no-scrollbar">
            {NAV.map((item) => {
              const active = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg text-[10px] shrink-0",
                    active ? "text-violet-300" : "text-muted-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="truncate max-w-[64px]">{item.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 md:p-6 pb-20 md:pb-6">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <motion.h1
                key={currentView + "-title"}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="text-xl md:text-2xl font-semibold tracking-tight"
              >
                {current.label}
              </motion.h1>
              <p className="text-xs text-muted-foreground mt-0.5">{current.hint}</p>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
