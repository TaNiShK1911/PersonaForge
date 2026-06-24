import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { usePersonalization } from "@/lib/use-personalization";
import { isConfigured } from "@/lib/personaforge-sdk";
import { PRODUCTS, recommendByIds } from "@/lib/products";
import { ProductCard } from "./ProductCard";

export function PersonalizedSection() {
  const { data, isLoading, isFetching, isSuccess } = usePersonalization();
  const configured = typeof window !== "undefined" && isConfigured();
  const firstLoad = configured && (isLoading || (!isSuccess && !data));

  const persona = data?.persona ?? (configured ? "Building your profile…" : "Personalized For You");
  const tagline =
    data?.tagline ??
    (firstLoad
      ? "PersonaForge is studying your taste in real time. New picks land in seconds."
      : configured
        ? "Tap, scroll, save — we’re sharpening your edit with every move."
        : "Connect PersonaForge to power live recommendations from your behavior.");
  const headline =
    data?.headline ??
    (firstLoad ? "Building your profile…" : "Hand-picked for the way you shop.");
  const ctaText = data?.ctaText ?? "Shop your edit";
  const ctaHref = data?.ctaHref ?? "/products";

  const recs =
    data?.recommended_product_ids && data.recommended_product_ids.length
      ? recommendByIds(data.recommended_product_ids).slice(0, 6)
      : PRODUCTS.slice(0, 6);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground sm:p-10">
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-coral/30 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-coral/20 blur-3xl" />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-widest backdrop-blur">
            {firstLoad || isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Personalized · {persona}
          </div>
          <h2 className="mt-4 max-w-2xl font-display text-3xl leading-tight sm:text-5xl">
            {headline}
          </h2>
          <p className="mt-3 max-w-lg text-sm text-primary-foreground/75">{tagline}</p>
        </div>
        <Link
          to={ctaHref as string}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-coral px-5 py-3 text-sm font-medium text-coral-foreground transition hover:bg-coral/90"
        >
          {ctaText} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
        {(firstLoad ? PRODUCTS.slice(0, 6) : recs).map((p) => (
          <div key={p.id} className="rounded-2xl bg-background p-3 text-foreground">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
