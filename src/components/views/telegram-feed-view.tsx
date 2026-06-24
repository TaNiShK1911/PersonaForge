"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Bot,
  Users,
  Zap,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PERSONA_META, PERSONA_KINDS } from "@/lib/types";

interface PushResult {
  pushed: number;
  failed: number;
  total: number;
  results: { chatId: string; success: boolean; error?: string }[];
  latencyMs: number;
}

export function TelegramFeedView() {
  const [selectedPersona, setSelectedPersona] = useState<string>("price_sensitive");
  const [headline, setHeadline] = useState("");
  const [cta, setCta] = useState("");
  const [content, setContent] = useState("");
  const [pushing, setPushing] = useState(false);
  const [lastResult, setLastResult] = useState<PushResult | null>(null);
  const [pushHistory, setPushHistory] = useState<
    { personaKind: string; headline: string; result: PushResult; timestamp: Date }[]
  >([]);

  async function pushAd() {
    if (!headline.trim()) return;
    setPushing(true);

    try {
      const res = await fetch("/api/telegram/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaKind: selectedPersona,
          headline: headline.trim(),
          cta: cta.trim() || undefined,
          generatedContent: content.trim() || undefined,
          reasoning: `Targeted ad for ${(PERSONA_META as any)[selectedPersona]?.name ?? selectedPersona} persona`,
        }),
      });

      if (res.ok) {
        const result: PushResult = await res.json();
        setLastResult(result);
        setPushHistory((prev) => [
          { personaKind: selectedPersona, headline, result, timestamp: new Date() },
          ...prev,
        ]);
      }
    } catch {
      setLastResult({ pushed: 0, failed: 0, total: 0, results: [], latencyMs: 0 });
    } finally {
      setPushing(false);
    }
  }

  async function pushFromAgents() {
    setPushing(true);
    try {
      // First run agents to generate content
      const agentRes = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: `Generate a persona-specific ad for ${selectedPersona}`,
          triggeredBy: "telegram-feed",
        }),
      });

      if (agentRes.ok) {
        const agentData = await agentRes.json();
        const generatedHeadline =
          agentData.generatedContent?.headline ?? "Personalized offer just for you";
        const generatedCta =
          agentData.generatedContent?.cta ?? "Shop Now";
        const generatedContent =
          agentData.generatedContent?.adCopy ?? "";

        // Now push the generated content
        const pushRes = await fetch("/api/telegram/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personaKind: selectedPersona,
            headline: generatedHeadline,
            cta: generatedCta,
            generatedContent,
            reasoning: `AI-generated ad for ${(PERSONA_META as any)[selectedPersona]?.name ?? selectedPersona} — via agent chain`,
          }),
        });

        if (pushRes.ok) {
          const result: PushResult = await pushRes.json();
          setLastResult(result);
          setHeadline(generatedHeadline);
          setCta(generatedCta);
          setContent(generatedContent);
          setPushHistory((prev) => [
            { personaKind: selectedPersona, headline: generatedHeadline, result, timestamp: new Date() },
            ...prev,
          ]);
        }
      }
    } catch {
      // Handle error
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Compose Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Ad Composer */}
        <div className="border rounded-xl p-4 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold">Compose Ad Push</span>
          </div>

          {/* Persona Selector */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Target Persona</label>
            <div className="flex flex-wrap gap-1.5">
              {PERSONA_KINDS.map((kind) => {
                const meta = (PERSONA_META as any)[kind];
                return (
                  <button
                    key={kind}
                    onClick={() => setSelectedPersona(kind)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                      selectedPersona === kind
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span>{meta?.emoji ?? "🎯"}</span>
                    <span>{meta?.name ?? kind}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Headline */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Flash Sale: Save 40% Today"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* CTA */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Call to Action</label>
            <input
              type="text"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="Claim My Discount"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Ad Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Optional ad body content..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={pushAd}
              disabled={!headline.trim() || pushing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {pushing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Push to Telegram
            </button>
            <button
              onClick={pushFromAgents}
              disabled={pushing}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              AI Generate & Push
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="border rounded-xl p-4 bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold">Telegram Preview</span>
          </div>

          {/* Telegram-style message preview */}
          <div className="bg-[#0e1621] rounded-xl p-4 text-white text-sm space-y-2 min-h-[200px]">
            <div className="text-blue-400 text-xs font-medium">PersonaForge Bot</div>
            <div className="space-y-2">
              <p className="text-xs text-gray-400">🎯 <strong>PersonaForge Ad</strong></p>
              <p className="text-xs text-gray-500">━━━━━━━━━━━━━━━━━━</p>
              <p className="font-medium">
                📣 {headline || "Your headline here..."}
              </p>
              {content && <p className="text-sm text-gray-300">{content}</p>}
              {cta && <p className="text-blue-400">👉 {cta}</p>}
              <p className="text-xs text-gray-500">━━━━━━━━━━━━━━━━━━</p>
              <p className="text-xs text-gray-500">
                🧬 Persona: <code className="text-gray-400">{selectedPersona}</code>
              </p>
              <p className="text-xs text-gray-600 italic">⚡ Powered by PersonaForge</p>
            </div>
          </div>

          {/* Last Push Result */}
          {lastResult && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 border rounded-lg"
            >
              <div className="flex items-center gap-2 text-sm">
                {lastResult.pushed > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-amber-500" />
                )}
                <span className="font-medium">
                  {lastResult.pushed > 0
                    ? `Pushed to ${lastResult.pushed} chat${lastResult.pushed > 1 ? "s" : ""}`
                    : "No subscribers found"}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {lastResult.latencyMs}ms
                </span>
              </div>
              {lastResult.failed > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  {lastResult.failed} delivery failure{lastResult.failed > 1 ? "s" : ""}
                </p>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Push History */}
      {pushHistory.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Push History</span>
          </div>
          <div className="divide-y max-h-[300px] overflow-y-auto">
            {pushHistory.map((push, i) => {
              const meta = (PERSONA_META as any)[push.personaKind];
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="text-base">{meta?.emoji ?? "🎯"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{push.headline}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {meta?.name ?? push.personaKind} · {push.result.pushed}/{push.result.total} delivered
                    </div>
                  </div>
                  {push.result.pushed > 0 ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                      Delivered
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                      No subscribers
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {push.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
