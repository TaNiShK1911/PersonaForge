"use client";

import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";
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
  Network,
  Bot,
  Cpu,
  Radio,
  Send,
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
  {
    id: "identity",
    label: "Identity Resolution",
    icon: Network,
    hint: "Cross-channel stitching",
    accent: "from-orange-500/20 to-orange-500/0",
  },
  {
    id: "copilot",
    label: "AI Copilot",
    icon: Bot,
    hint: "RAG-powered chat",
    accent: "from-violet-500/20 to-fuchsia-500/0",
  },
  {
    id: "agents",
    label: "Agent Console",
    icon: Cpu,
    hint: "Multi-agent system",
    accent: "from-indigo-500/20 to-indigo-500/0",
  },
  {
    id: "liveDemo",
    label: "Live Demo Monitor",
    icon: Radio,
    hint: "Real-time events",
    accent: "from-emerald-500/20 to-emerald-500/0",
  },
  {
    id: "telegram",
    label: "Telegram Feed",
    icon: Send,
    hint: "Push persona ads",
    accent: "from-blue-500/20 to-blue-500/0",
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
      <header className="sticky top-0 z-30 bg-white border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <div className="text-sm font-semibold leading-tight display-lg-mobile text-base">
                Persona<span className="text-primary">Forge</span>
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                Causal Micro-Persona Engine
              </div>
            </div>
            </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-white sticky top-14 self-start h-[calc(100vh-3.5rem)]">
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
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg bg-accent"
                      transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative w-4 h-4 shrink-0",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span className="relative flex-1 text-left font-medium">
                    {item.label}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="nav-dot"
                      className="relative w-1.5 h-1.5 rounded-full bg-primary"
                    />
                  )}
                </button>
              );
            })}
          </nav>
          
        </aside>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border">
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
                    active ? "text-primary" : "text-muted-foreground"
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
