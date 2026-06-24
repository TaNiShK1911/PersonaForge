import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Minus, Plus, ShieldCheck, Truck, RotateCcw, Star } from "lucide-react";
import { getProduct, relatedProducts, alsoBought } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { addToCart, toggleWishlist, useWishlist } from "@/lib/store";
import { track } from "@/lib/personaforge-sdk";
import { ProductGrid } from "@/components/site/ProductGrid";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/products/$id")({
  loader: ({ params }) => {
    const p = getProduct(params.id);
    if (!p) throw notFound();
    return { product: p };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name} — Bazaar` },
          { name: "description", content: loaderData.product.description },
          { property: "og:title", content: loaderData.product.name },
          { property: "og:description", content: loaderData.product.description },
          { property: "og:image", content: loaderData.product.images[0] },
        ]
      : [{ title: "Product — Bazaar" }],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl">We couldn’t find that piece.</h1>
      <Link to="/products" className="mt-6 inline-block text-primary underline">Back to the shop</Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p>{error.message}</p>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const [size, setSize] = useState(product.sizes[0]);
  const [color, setColor] = useState(product.colors[0].name);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const wish = useWishlist();
  const isWish = wish.includes(product.id);

  useEffect(() => {
    track("product_view", { productId: product.id, name: product.name });
  }, [product.id, product.name]);

  const related = relatedProducts(product);
  const also = alsoBought(product);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-cream">
            <img src={product.images[imgIdx]} alt={product.name} className="h-full w-full object-cover" />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {product.images.map((src: string, i: number) => (
                <button
                  key={src}
                  onClick={() => setImgIdx(i)}
                  className={cn(
                    "aspect-square w-20 overflow-hidden rounded-xl border-2",
                    imgIdx === i ? "border-primary" : "border-transparent",
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-coral">{product.brand}</div>
          <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn("h-4 w-4", i < Math.round(product.rating) ? "fill-coral text-coral" : "text-muted-foreground/30")} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{product.rating.toFixed(1)} · {product.reviewCount} reviews</span>
          </div>
          <div className="mt-5 flex items-baseline gap-3">
            <div className="font-display text-3xl">{formatPrice(product.priceCents)}</div>
            {product.compareAtCents && (
              <div className="text-muted-foreground line-through">{formatPrice(product.compareAtCents)}</div>
            )}
          </div>

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

          {product.stock <= 10 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-coral/15 px-3 py-1 text-xs font-medium text-coral">
              ● Only {product.stock} left in stock
            </div>
          )}

          {/* Color */}
          <div className="mt-8">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Color · <span className="text-foreground">{color}</span></div>
            <div className="mt-3 flex gap-2">
              {product.colors.map((c: { name: string; hex: string }) => (
                <button
                  key={c.name}
                  onClick={() => setColor(c.name)}
                  aria-label={c.name}
                  style={{ background: c.hex }}
                  className={cn(
                    "h-9 w-9 rounded-full border-2",
                    color === c.name ? "border-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-background" : "border-border",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Size · <span className="text-foreground">{size}</span></div>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.sizes.map((s: string) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={cn(
                    "h-10 min-w-12 rounded-full border px-4 text-sm transition",
                    size === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Qty + actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border border-border p-1">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent">
                <Minus className="h-4 w-4" />
              </button>
              <div className="w-8 text-center text-sm font-medium">{qty}</div>
              <button onClick={() => setQty(qty + 1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => {
                addToCart({ productId: product.id, size, color, qty });
                track("add_to_cart", { productId: product.id, size, color, qty });
                toast.success(`${product.name} added to cart`);
              }}
              className="h-11 flex-1 min-w-40 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Add to cart · {formatPrice(product.priceCents * qty)}
            </button>
            <button
              onClick={() => {
                const now = toggleWishlist(product.id);
                if (now) track("wishlist_add", { productId: product.id });
                toast(now ? "Saved to wishlist" : "Removed from wishlist");
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border hover:border-primary"
              aria-label="Wishlist"
            >
              <Heart className={cn("h-5 w-5", isWish && "fill-coral text-coral")} />
            </button>
          </div>

          {/* Trust */}
          <div className="mt-8 grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card p-4 text-center text-xs">
            <div className="flex flex-col items-center gap-1.5"><Truck className="h-4 w-4 text-primary" />Free shipping</div>
            <div className="flex flex-col items-center gap-1.5"><RotateCcw className="h-4 w-4 text-primary" />30-day returns</div>
            <div className="flex flex-col items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" />Secure checkout</div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="details" className="mt-10">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="shipping">Shipping</TabsTrigger>
              <TabsTrigger
                value="reviews"
                onClick={() => track("review_view", { productId: product.id })}
              >
                Reviews ({product.reviewCount})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="prose prose-sm text-muted-foreground">
              <p>{product.description}</p>
              <p>Material: Premium natural fibers. Sustainably sourced.</p>
              <p>Care: Dry clean recommended. Cold-wash safe on a gentle cycle.</p>
            </TabsContent>
            <TabsContent value="shipping" className="text-sm text-muted-foreground">
              Complimentary 2-day shipping on orders over $100. International from $14.
              Free returns within 30 days of delivery.
            </TabsContent>
            <TabsContent value="reviews" className="space-y-4 text-sm">
              {[
                { n: "Aïda L.", r: 5, t: "Better than I’d hoped — the fabric is gorgeous and the fit runs true." },
                { n: "Marcus J.", r: 5, t: "I’ve been wearing this on rotation. Worth every cent." },
                { n: "Sasha K.", r: 4, t: "Beautiful piece. Wish there was one more size up." },
              ].map((rv) => (
                <div key={rv.n} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{rv.n}</div>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("h-3.5 w-3.5", i < rv.r ? "fill-coral text-coral" : "text-muted-foreground/30")} />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-muted-foreground">{rv.t}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <section className="mt-24">
        <SectionHeading eyebrow="You might also like" title="Related pieces" />
        <ProductGrid items={related} />
      </section>

      <section className="mt-24">
        <SectionHeading eyebrow="Pairs well with" title="Customers also bought" />
        <ProductGrid items={also} />
      </section>
    </div>
  );
}
