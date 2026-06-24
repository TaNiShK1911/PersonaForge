import type { Product } from "@/lib/products";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ items, eager = false }: { items: Product[]; eager?: boolean }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
        Nothing matches yet. Try widening your filters.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((p, i) => (
        <ProductCard key={p.id} product={p} eager={eager && i < 4} />
      ))}
    </div>
  );
}
