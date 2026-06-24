"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Clock,
  Zap,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { documentType: string; documentId: string; similarity: number }[];
  suggestAgentRun?: boolean;
  tokensUsed?: number;
  latencyMs?: number;
  provider?: string;
  createdAt?: string;
}

interface Conversation {
  id: string;
  title?: string;
  messages: ChatMessage[];
}

export function AiCopilotView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const res = await fetch("/api/chat?limit=10");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch {
      // Silent fail
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage.content,
          conversationId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConversationId(data.conversationId);

        const assistantMessage: ChatMessage = {
          id: data.messageId,
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          suggestAgentRun: data.suggestAgentRun,
          tokensUsed: data.tokensUsed,
          latencyMs: data.latencyMs,
          provider: data.provider,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Connection failed. Please check if the server is running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function triggerAgentRun() {
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    if (!lastUserMessage) return;

    setLoading(true);
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: lastUserMessage.content,
          conversationId,
          triggeredBy: "ai-copilot",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `agent-${Date.now()}`,
            role: "assistant",
            content: data.output ?? "Agent analysis completed. Check the Agent Console for full details.",
            latencyMs: data.latencyMs,
            provider: "agent-chain",
          },
        ]);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  function startNewConversation() {
    setMessages([]);
    setConversationId(null);
  }

  function loadConversation(conv: Conversation) {
    setConversationId(conv.id);
    setMessages(
      conv.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
    );
  }

  const suggestedQuestions = [
    "Which persona converts best on discounts?",
    "What treatment should I use for impulse buyers?",
    "Show me the top performing campaign angles",
    "Run a full analysis on my highest-value users",
    "What would happen if I increase urgency messaging?",
  ];

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Sidebar: Conversations */}
      <div className="hidden lg:flex w-64 shrink-0 flex-col border rounded-xl bg-card">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="text-sm font-medium">Conversations</span>
          <button
            onClick={startNewConversation}
            className="p-1 hover:bg-muted rounded-md transition-colors"
            title="New conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv)}
              className={`w-full text-left p-2 rounded-lg text-xs hover:bg-muted transition-colors truncate ${
                conversationId === conv.id ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              }`}
            >
              {conv.title ?? "Untitled conversation"}
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">
              No conversations yet. Ask a question to start!
            </p>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col border rounded-xl bg-card overflow-hidden">
        {/* Chat Header */}
        <div className="px-4 py-3 border-b flex items-center gap-3 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold">AI Copilot</div>
            <div className="text-[10px] text-muted-foreground">
              RAG-powered marketing intelligence · Grounded in live data
            </div>
          </div>
          <Badge variant="outline" className="ml-auto text-[10px]">
            <Sparkles className="w-3 h-3 mr-1" />
            RAG
          </Badge>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-violet-500" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-1">Ask PersonaForge Anything</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  I can answer questions about your users, personas, campaigns, and analytics — grounded in your live platform data.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(q);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full border hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none break-words [&>p]:mb-2 [&>p:last-child]:mb-0 [&>pre]:bg-background/50 [&>pre]:text-xs [&>pre]:p-2 [&>pre]:rounded-md" 
                    dangerouslySetInnerHTML={{ __html: msg.content }} 
                  />

                  {/* Metadata */}
                  {msg.role === "assistant" && (msg.latencyMs || msg.provider) && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                      {msg.provider && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          {msg.provider}
                        </Badge>
                      )}
                      {msg.latencyMs && (
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {msg.latencyMs}ms
                        </span>
                      )}
                      {msg.tokensUsed !== undefined && msg.tokensUsed > 0 && (
                        <span className="text-[9px] text-muted-foreground">
                          {msg.tokensUsed} tokens
                        </span>
                      )}
                    </div>
                  )}

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <div className="text-[9px] text-muted-foreground font-medium mb-1 flex items-center gap-1">
                        <BookOpen className="w-2.5 h-2.5" />
                        Sources
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {msg.sources.slice(0, 4).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0">
                            {s.documentType} ({(s.similarity * 100).toFixed(0)}%)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agent Run Button */}
                  {msg.suggestAgentRun && (
                    <button
                      onClick={triggerAgentRun}
                      className="mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90 transition-opacity"
                    >
                      <Zap className="w-3 h-3" />
                      Run with Agents
                    </button>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-white animate-pulse" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3 text-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-background">
          <div className="flex gap-2 items-end">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about your users, personas, campaigns..."
              className="flex-1 px-4 py-2.5 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
