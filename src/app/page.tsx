import Link from "next/link";
import { ArrowRight, Zap, Target, Activity, CheckCircle } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="px-6 h-16 border-b border-border flex items-center justify-between bg-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">Persona<span className="text-primary">Forge</span></span>
        </div>
        <nav>
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign In
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="py-24 px-6 flex flex-col items-center text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold uppercase tracking-wider mb-8">
            <Activity className="w-4 h-4" />
            Causal Micro-Persona Engine
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 display-xl">
            Predict intent.<br />Drive <span className="text-primary">conversion.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl body-lg">
            PersonaForge is an AI-powered platform that learns user behavior, identifies causal drivers, and simulates counterfactuals to explain every recommendation.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-transform hover:-translate-y-0.5"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 bg-white border border-border text-foreground rounded-xl font-semibold hover:bg-muted transition-colors"
            >
              View Documentation
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-white border-t border-border">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-12">
            <div className="flex flex-col items-start text-left">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2 headline-sm">Dynamic Personas</h3>
              <p className="text-muted-foreground body-md">Continuously cluster users into high-resolution micro-personas based on real-time event streams.</p>
            </div>
            <div className="flex flex-col items-start text-left">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2 headline-sm">Causal Inference</h3>
              <p className="text-muted-foreground body-md">Move beyond correlation. Calculate the Average Treatment Effect (ATE) of specific interventions.</p>
            </div>
            <div className="flex flex-col items-start text-left">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2 headline-sm">Explainable AI</h3>
              <p className="text-muted-foreground body-md">Generate human-readable explanations for every model recommendation to ensure full transparency.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border bg-white">
        &copy; {new Date().getFullYear()} PersonaForge. All rights reserved.
      </footer>
    </div>
  );
}
