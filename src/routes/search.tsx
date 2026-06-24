import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { searchProducts } from "@/lib/products";
import { ProductGrid } from "@/components/site/ProductGrid";
import { SectionHeading } from "@/components/site/SectionHeading";
import { track } from "@/lib/personaforge-sdk";

type Search = { q?: string };

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  head: () => ({
    meta: [{ title: "Search — Bazaar" }],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const results = q ? searchProducts(q) : [];

  useEffect(() => {
    if (q) track("search", { q, results: results.length });
  }, [q, results.length]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Search"
        title={q ? `Results for “${q}”` : "Search the shop"}
      />
      {!q && <p className="text-sm text-muted-foreground">Try the search bar above.</p>}
      {q && <ProductGrid items={results} />}
    </div>
  );
}
