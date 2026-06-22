"use client";

import { signIn } from "next-auth/react";
import { Zap, ShieldAlert, LineChart, Eye } from "lucide-react";

export default function LoginPage() {
  const handleLogin = (email: string) => {
    signIn("credentials", { email, callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-8 text-center border-b border-border">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold headline-sm">Welcome Back</h1>
          <p className="text-muted-foreground mt-2 body-md">Choose a demo role to access the platform.</p>
        </div>
        
        <div className="p-6 space-y-4">
          <button
            onClick={() => handleLogin("admin@personaforge.dev")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-accent/50 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-foreground">Admin</div>
              <div className="text-xs text-muted-foreground">Full access to settings & pipelines</div>
            </div>
          </button>

          <button
            onClick={() => handleLogin("analyst@personaforge.dev")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-accent/50 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
              <LineChart className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-foreground">Data Analyst</div>
              <div className="text-xs text-muted-foreground">Access causal models and bandit optimizer</div>
            </div>
          </button>

          <button
            onClick={() => handleLogin("viewer@personaforge.dev")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-accent/50 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700 group-hover:scale-105 transition-transform">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-foreground">Viewer</div>
              <div className="text-xs text-muted-foreground">Read-only access to dashboards</div>
            </div>
          </button>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-8">
        &copy; {new Date().getFullYear()} PersonaForge. Internal Demo Environment.
      </p>
    </div>
  );
}
