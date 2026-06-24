import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { getProduct } from "@/lib/products";
import { useWishlist } from "@/lib/store";
import { ProductGrid } from "@/components/site/ProductGrid";
import { SectionHeading } from "@/components/site/SectionHeading";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — Bazaar" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const wish = useWishlist();
  const items = wish.map((id) => getProduct(id)).filter(Boolean) as NonNullable<ReturnType<typeof getProduct>>[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Saved" title="Your wishlist" />
      {!items.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cream">
            <Heart className="h-5 w-5 text-coral" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing saved yet. Tap the heart on anything you love.
          </p>
          <Link to="/products" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            Browse the shop
          </Link>
        </div>
      ) : (
        <ProductGrid items={items} />
      )}
    </div>
  );
}
