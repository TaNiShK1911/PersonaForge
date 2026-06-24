import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PRODUCTS, CATEGORIES, type Product } from "@/lib/products";
import { ProductGrid } from "@/components/site/ProductGrid";
import { Slider } from "@/components/ui/slider";
import { SectionHeading } from "@/components/site/SectionHeading";
import { track } from "@/lib/personaforge-sdk";

type Search = { q?: string; cat?: string; sort?: string; min?: number; max?: number };

export const Route = createFileRoute("/products")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    cat: typeof s.cat === "string" ? s.cat : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
    min: typeof s.min === "number" ? s.min : undefined,
    max: typeof s.max === "number" ? s.max : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop all — Bazaar" },
      { name: "description", content: "Browse the full Bazaar catalogue: women, men, accessories and home." },
    ],
  }),
  component: ProductsPage,
});

const MAX_PRICE = 500;

function ProductsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/products" });
  const [range, setRange] = useState<[number, number]>([search.min ?? 0, search.max ?? MAX_PRICE]);
  const [q, setQ] = useState(search.q ?? "");

  const filtered: Product[] = useMemo(() => {
    let list = [...PRODUCTS];
    if (search.cat) list = list.filter((p) => p.categorySlug === search.cat);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((p) =>
        [p.name, p.brand, p.categorySlug, ...p.tags].join(" ").toLowerCase().includes(s),
      );
    }
    list = list.filter((p) => {
      const usd = p.priceCents / 100;
      return usd >= range[0] && usd <= range[1];
    });
    switch (search.sort) {
      case "price-asc": list.sort((a, b) => a.priceCents - b.priceCents); break;
      case "price-desc": list.sort((a, b) => b.priceCents - a.priceCents); break;
      case "rating": list.sort((a, b) => b.rating - a.rating); break;
      default: list.sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew));
    }
    return list;
  }, [search.cat, search.sort, range, q]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Catalogue" title={search.cat ? CATEGORIES.find((c) => c.slug === search.cat)?.name ?? "Shop all" : "Shop all"} />

      <div className="mb-8 grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-6 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Search</label>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                track("search", { q: e.target.value });
              }}
              placeholder="Search products"
              className="mt-2 h-10 w-full rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Categories</div>
            <div className="mt-3 space-y-1.5 text-sm">
              <button
                onClick={() => navigate({ search: (s: Search) => ({ ...s, cat: undefined }) })}
                className={`block text-left ${!search.cat ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => {
                    navigate({ search: (s: Search) => ({ ...s, cat: c.slug }) });
                    track("category_browse", { slug: c.slug });
                  }}
                  className={`block text-left ${search.cat === c.slug ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Price</div>
              <div className="text-xs text-muted-foreground">${range[0]} – ${range[1]}</div>
            </div>
            <Slider
              value={range}
              min={0}
              max={MAX_PRICE}
              step={10}
              onValueChange={(v) => setRange([v[0], v[1]] as [number, number])}
              className="mt-4"
            />
          </div>
        </aside>

        <div>
          <div className="mb-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{filtered.length} items</div>
            <select
              value={search.sort ?? "newest"}
              onChange={(e) => navigate({ search: (s: Search) => ({ ...s, sort: e.target.value }) })}
              className="h-10 rounded-full border border-border bg-background px-4 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price · low to high</option>
              <option value="price-desc">Price · high to low</option>
              <option value="rating">Highest rated</option>
            </select>
          </div>
          <ProductGrid items={filtered} />
        </div>
      </div>
    </div>
  );
}
