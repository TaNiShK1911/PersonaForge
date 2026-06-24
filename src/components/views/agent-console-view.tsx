"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Users,
  Sparkles,
  Target,
  BarChart3,
  FlaskConical,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AgentTraceEntry {
  agentName: string;
  durationMs: number;
  status: "success" | "error" | "skipped";
  output?: string;
  error?: string;
}

interface AgentRunData {
  id: string;
  triggeredBy: string;
  status: string;
  input: { userId?: string; question?: string; goal?: string } | null;
  output: string | null;
  trace: AgentTraceEntry[] | null;
  agentsUsed: string[];
  totalTokens: number;
  latencyMs: number;
  createdAt: string;
}

const AGENT_ICONS: Record<string, typeof Cpu> = {
  SupervisorAgent: Cpu,
  PersonaClassifierAgent: Users,
  ContentGeneratorAgent: Sparkles,
  BanditOptimizerAgent: Target,
  InsightAgent: BarChart3,
  CounterfactualAgent: FlaskConical,
};

const AGENT_COLORS: Record<string, string> = {
  SupervisorAgent: "from-violet-500 to-purple-500",
  PersonaClassifierAgent: "from-cyan-500 to-blue-500",
  ContentGeneratorAgent: "from-rose-500 to-pink-500",
  BanditOptimizerAgent: "from-amber-500 to-orange-500",
  InsightAgent: "from-emerald-500 to-green-500",
  CounterfactualAgent: "from-fuchsia-500 to-purple-500",
};

export function AgentConsoleView() {
  const [runs, setRuns] = useState<AgentRunData[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningDemo, setRunningDemo] = useState(false);
  const [selectedRun, setSelectedRun] = useState<AgentRunData | null>(null);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRuns();
  }, []);

  async function loadRuns() {
    setLoading(true);
    try {
      const res = await fetch("/api/agents?limit=20");
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs ?? []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  async function triggerDemoRun(useLatestVisitor = false) {
    setRunningDemo(true);
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: useLatestVisitor ? "latest" : undefined,
          goal: useLatestVisitor 
            ? "Analyze the latest active visitor — classify their persona based on live behavior, generate content, and run a counterfactual" 
            : "Full demo analysis — classify personas, generate content, optimize treatment, produce insights, and run counterfactual simulation",
          triggeredBy: "agent-console-demo",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await loadRuns();
        // Auto-select the new run
        const newRun: AgentRunData = {
          id: data.runId,
          triggeredBy: "agent-console-demo",
          status: data.status,
          input: { goal: useLatestVisitor ? "Analyze latest visitor" : "Full demo analysis" },
          output: data.output,
          trace: data.trace,
          agentsUsed: ["SupervisorAgent", "PersonaClassifierAgent", "ContentGeneratorAgent", "BanditOptimizerAgent", "InsightAgent", "CounterfactualAgent"],
          totalTokens: data.totalTokens ?? 0,
          latencyMs: data.latencyMs,
          createdAt: new Date().toISOString(),
        };
        setSelectedRun(newRun);
      }
    } catch {
      // Handle error
    } finally {
      setRunningDemo(false);
    }
  }

  function toggleAgent(agentName: string) {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentName)) next.delete(agentName);
      else next.add(agentName);
      return next;
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case "completed_with_errors":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><XCircle className="w-3 h-3 mr-1" />Partial</Badge>;
      case "running":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => triggerDemoRun(false)}
          disabled={runningDemo}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {runningDemo ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {runningDemo ? "Running Agent Chain..." : "Run Demo Analysis"}
        </button>
        <button
          onClick={() => triggerDemoRun(true)}
          disabled={runningDemo}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {runningDemo ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Users className="w-4 h-4" />
          )}
          Run for Latest Visitor
        </button>
        <button
          onClick={loadRuns}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm hover:bg-muted transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Agent Chain Visualization */}
      {selectedRun?.trace && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border rounded-xl p-4 bg-card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold">Agent Chain Execution</span>
            <span className="text-xs text-muted-foreground ml-auto">
              Total: {selectedRun.latencyMs}ms
            </span>
          </div>

          {/* Chain Flow */}
          <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
            {selectedRun.trace.map((entry, i) => {
              const Icon = AGENT_ICONS[entry.agentName] ?? Cpu;
              const isSuccess = entry.status === "success";
              return (
                <div key={entry.agentName} className="flex items-center gap-1 shrink-0">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${
                      isSuccess ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="font-medium">{entry.agentName.replace("Agent", "")}</span>
                    <span className="text-[9px] opacity-70">{entry.durationMs}ms</span>
                  </div>
                  {i < selectedRun.trace.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Expandable Agent Details */}
          <div className="space-y-2">
            {selectedRun.trace.map((entry) => {
              const Icon = AGENT_ICONS[entry.agentName] ?? Cpu;
              const isExpanded = expandedAgents.has(entry.agentName);
              return (
                <div key={entry.agentName} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleAgent(entry.agentName)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${AGENT_COLORS[entry.agentName] ?? "from-gray-400 to-gray-500"} flex items-center justify-center`}>
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-medium">{entry.agentName}</span>
                    <span className="text-xs text-muted-foreground ml-auto mr-2">
                      {entry.durationMs}ms
                    </span>
                    {entry.status === "success" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-3 pb-3 text-xs text-muted-foreground overflow-hidden"
                      >
                        <div className="pt-2 border-t">
                          {entry.output && (
                            <div 
                              className="prose prose-xs dark:prose-invert max-w-none break-words [&>p]:mb-1 [&>p:last-child]:mb-0"
                              dangerouslySetInnerHTML={{ __html: entry.output }}
                            />
                          )}
                          {entry.error && (
                            <div 
                              className="prose prose-xs text-red-500 max-w-none break-words mt-2"
                              dangerouslySetInnerHTML={{ __html: entry.error }}
                            />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Final Output */}
          {selectedRun.output && (
            <div className="mt-4 p-3 border rounded-lg bg-muted/30">
              <div className="text-xs font-medium mb-2 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                Final Recommendation
              </div>
              <div 
                className="prose prose-sm dark:prose-invert max-w-none break-words max-h-64 overflow-y-auto [&>p]:mb-2 [&>p:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: selectedRun.output }}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Recent Runs Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Recent Agent Runs</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {runs.length} runs
          </span>
        </div>
        <div className="divide-y">
          {runs.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No agent runs yet. Click &ldquo;Run Demo Analysis&rdquo; to start.
            </div>
          )}
          {runs.map((run) => (
            <button
              key={run.id}
              onClick={() => setSelectedRun(run)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors ${
                selectedRun?.id === run.id ? "bg-accent" : ""
              }`}
            >
              <Cpu className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium truncate">
                  {(run.input as any)?.goal ?? (run.input as any)?.question ?? "Agent Run"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {run.triggeredBy} · {run.agentsUsed.length} agents · {run.latencyMs}ms
                </div>
              </div>
              {getStatusBadge(run.status)}
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(run.createdAt).toLocaleTimeString()}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
