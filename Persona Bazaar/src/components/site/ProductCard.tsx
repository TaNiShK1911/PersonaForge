import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { toggleWishlist, useWishlist } from "@/lib/store";
import { track } from "@/lib/personaforge-sdk";
import { cn } from "@/lib/utils";

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  const wish = useWishlist();
  const isWish = wish.includes(product.id);

  return (
    <Link
      to="/products/$id"
      params={{ id: product.id }}
      className="group block"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-cream">
        <img
          src={product.images[0]}
          alt={product.name}
          loading={eager ? "eager" : "lazy"}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {product.compareAtCents && (
          <span className="absolute left-3 top-3 rounded-full bg-coral px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-coral-foreground">
            Sale
          </span>
        )}
        {product.isNew && !product.compareAtCents && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
            New
          </span>
        )}
        <button
          type="button"
          aria-label="Save to wishlist"
          onClick={(e) => {
            e.preventDefault();
            const now = toggleWishlist(product.id);
            if (now) track("wishlist_add", { productId: product.id });
          }}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur transition hover:scale-110"
        >
          <Heart className={cn("h-4 w-4", isWish && "fill-coral text-coral")} />
        </button>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{product.brand}</div>
          <div className="mt-0.5 text-sm font-medium text-foreground">{product.name}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">{formatPrice(product.priceCents)}</div>
          {product.compareAtCents && (
            <div className="text-xs text-muted-foreground line-through">
              {formatPrice(product.compareAtCents)}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
