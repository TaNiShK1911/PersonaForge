"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useForgeStore } from "@/lib/store";
import { GlassPanel, StatPill } from "@/components/personaforge/primitives";
import {
  Network,
  Mail,
  Smartphone,
  Globe,
  Tv,
  Store,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface IdentityGraph {
  userId: string;
  nodes: Array<{
    id: string;
    signalType: string;
    signalValue: string;
    channel: string;
    firstSeenAt: string | Date;
    lastSeenAt: string | Date;
  }>;
  edges: Array<{
    signalAId: string;
    signalBId: string;
    matchScore: number;
    method: string;
  }>;
  resolutionConfidence: number;
  fragmentedCount: number;
  resolvedCount: number;
}

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  web: Globe,
  app: Smartphone,
  email: Mail,
  ctv: Tv,
  instore: Store,
};

const SIGNAL_TYPE_COLORS: Record<string, string> = {
  email: "#3b82f6",
  device_id: "#8b5cf6",
  cookie_id: "#ec4899",
  loyalty_id: "#f59e0b",
  phone_hash: "#10b981",
};

export function IdentityResolutionView() {
  const dataset = useForgeStore((s) => s.dataset);
  const selectedUserId = useForgeStore((s) => s.selectedUserId);
  const selectUser = useForgeStore((s) => s.selectUser);

  const [graph, setGraph] = useState<IdentityGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const userId = selectedUserId ?? dataset.users[0]?.id;
  const user = dataset.users.find((u) => u.id === userId);

  // Fetch identity graph
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/identity?userId=${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setGraph(data);
        setLoading(false);
      })
      .catch(() => {
        setGraph(null);
        setLoading(false);
      });
  }, [userId]);

  // Simplified force-directed layout (SVG positions)
  const layout = useMemo(() => {
    if (!graph || graph.nodes.length === 0) return { nodes: [], edges: [] };

    const width = 600;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;

    // Position nodes in a circle
    const nodePositions = graph.nodes.map((node, i) => {
      const angle = (i / graph.nodes.length) * 2 * Math.PI;
      const radius = showResolved ? 60 : 120; // Collapse to center when resolved
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });

    // Build edges
    const edgeLines = graph.edges.map((edge) => {
      const sourceNode = nodePositions.find((n) => n.id === edge.signalAId);
      const targetNode = nodePositions.find((n) => n.id === edge.signalBId);
      if (!sourceNode || !targetNode) return null;
      return {
        ...edge,
        x1: sourceNode.x,
        y1: sourceNode.y,
        x2: targetNode.x,
        y2: targetNode.y,
      };
    }).filter(Boolean);

    return { nodes: nodePositions, edges: edgeLines };
  }, [graph, showResolved]);

  if (!user) {
    return (
      <GlassPanel>
        <p className="text-muted-foreground text-sm">No user selected</p>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-4">
      {/* User selector */}
      <GlassPanel
        title="Identity Resolution Engine"
        subtitle="Stitch fragmented identifiers across channels into unified user profiles"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={userId}
            onChange={(e) => selectUser(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
          >
            {dataset.users.slice(0, 50).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
          {graph && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${
                  graph.resolutionConfidence > 0.7
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/40"
                }`}
              >
                {graph.resolutionConfidence > 0.7 ? (
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                ) : (
                  <AlertCircle className="w-3 h-3 mr-1" />
                )}
                Confidence: {(graph.resolutionConfidence * 100).toFixed(0)}%
              </Badge>
              <StatPill
                label="Signals"
                value={graph.nodes.length.toString()}
                color="violet"
              />
              <StatPill
                label="Matches"
                value={graph.edges.length.toString()}
                color="cyan"
              />
            </div>
          )}
        </div>
      </GlassPanel>

      {loading ? (
        <GlassPanel>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
          </div>
        </GlassPanel>
      ) : !graph || graph.nodes.length === 0 ? (
        <GlassPanel>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <p>
              No identity signals found. Run{" "}
              <code className="px-1 py-0.5 rounded bg-white/10">
                SEED_SAMPLE_USERS=true bun run db:seed
              </code>{" "}
              to generate sample data.
            </p>
          </div>
        </GlassPanel>
      ) : (
        <>
          {/* Toggle: before/after resolution */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={!showResolved ? "default" : "outline"}
              onClick={() => setShowResolved(false)}
              className="text-xs"
            >
              Before Resolution
            </Button>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <Button
              variant={showResolved ? "default" : "outline"}
              onClick={() => setShowResolved(true)}
              className="text-xs"
            >
              After Resolution
            </Button>
          </div>

          {/* Identity graph visualization */}
          <GlassPanel
            title={showResolved ? "Unified Profile" : "Fragmented Identifiers"}
            subtitle={
              showResolved
                ? `All ${graph.nodes.length} signals resolved into 1 profile`
                : `${graph.fragmentedCount} separate signals (appear as ${graph.fragmentedCount} different users)`
            }
          >
            <svg
              viewBox="0 0 600 400"
              className="w-full h-[400px] rounded-lg bg-black/20 border border-white/5"
            >
              {/* Edges */}
              {showResolved &&
                layout.edges.map((edge: any, i) => (
                  <motion.line
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    transition={{ delay: i * 0.05 }}
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    stroke={
                      edge.method === "deterministic" ? "#10b981" : "#8b5cf6"
                    }
                    strokeWidth={2}
                    strokeDasharray={
                      edge.method === "deterministic" ? "0" : "4 2"
                    }
                  />
                ))}

              {/* Nodes */}
              {layout.nodes.map((node: any, i) => {
                const Icon = CHANNEL_ICONS[node.channel] || Network;
                const color = SIGNAL_TYPE_COLORS[node.signalType] || "#6b7280";

                return (
                  <motion.g
                    key={node.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={24}
                      fill={`${color}22`}
                      stroke={color}
                      strokeWidth={2}
                    />
                    <text
                      x={node.x}
                      y={node.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="text-xs fill-white font-mono"
                    >
                      {node.signalType.slice(0, 3).toUpperCase()}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 40}
                      textAnchor="middle"
                      className="text-[10px] fill-gray-400"
                    >
                      {node.channel}
                    </text>
                  </motion.g>
                );
              })}

              {/* Center label when resolved */}
              {showResolved && (
                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  x={300}
                  y={200}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-xs fill-emerald-300 font-semibold"
                >
                  Unified User Profile
                </motion.text>
              )}
            </svg>
          </GlassPanel>

          {/* Signal details table */}
          <GlassPanel
            title="Signal Details"
            subtitle="Individual identity fragments detected across channels"
          >
            <div className="space-y-2">
              {graph.nodes.map((node, i) => {
                const Icon = CHANNEL_ICONS[node.channel] || Network;
                const color = SIGNAL_TYPE_COLORS[node.signalType] || "#6b7280";

                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-sm"
                      style={{
                        background: `${color}22`,
                        border: `1px solid ${color}55`,
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium font-mono truncate">
                        {node.signalValue}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {node.signalType} · {node.channel}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>
                        First seen:{" "}
                        {new Date(node.firstSeenAt).toLocaleDateString()}
                      </div>
                      <div>
                        Last seen:{" "}
                        {new Date(node.lastSeenAt).toLocaleDateString()}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlassPanel>

          {/* Match details */}
          {graph.edges.length > 0 && (
            <GlassPanel
              title="Identity Matches"
              subtitle="Probabilistic and deterministic matches connecting signals"
            >
              <div className="space-y-2">
                {graph.edges.map((edge, i) => {
                  const nodeA = graph.nodes.find((n) => n.id === edge.signalAId);
                  const nodeB = graph.nodes.find((n) => n.id === edge.signalBId);
                  if (!nodeA || !nodeB) return null;

                  return (
                    <motion.div
                      key={`${edge.signalAId}_${edge.signalBId}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5"
                    >
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          edge.method === "deterministic"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                            : "bg-violet-500/15 text-violet-300 border-violet-500/40"
                        }`}
                      >
                        {edge.method}
                      </Badge>
                      <div className="flex-1 text-xs font-mono">
                        <span className="text-muted-foreground">
                          {nodeA.signalType}
                        </span>
                        <ArrowRight className="inline-block w-3 h-3 mx-2 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {nodeB.signalType}
                        </span>
                      </div>
                      <div className="text-xs font-semibold">
                        {(edge.matchScore * 100).toFixed(0)}% match
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </GlassPanel>
          )}

          {/* Explainer */}
          <GlassPanel className="border-orange-500/30">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/40 flex items-center justify-center shrink-0">
                <Network className="w-4 h-4 text-orange-300" />
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground font-semibold">
                  Identity Resolution:{" "}
                </span>
                This engine mirrors Epsilon's COREid product. Each user's activity
                generates fragmented identifiers (email, device IDs, cookies, loyalty
                IDs) across channels (web, app, email, CTV, in-store).{" "}
                <span className="text-orange-300 font-semibold">
                  Deterministic matching
                </span>{" "}
                finds exact matches (same email across web + app).{" "}
                <span className="text-violet-300 font-semibold">
                  Probabilistic matching
                </span>{" "}
                uses a logistic regression model over temporal overlap, channel
                proximity, and type compatibility to stitch remaining signals. The
                result: one unified profile instead of N fragmented ghosts, enabling
                true cross-channel personalization.
              </div>
            </div>
          </GlassPanel>
        </>
      )}
    </div>
  );
}
