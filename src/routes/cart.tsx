import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, X } from "lucide-react";
import { useState } from "react";
import { getProduct } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { removeFromCart, updateCartQty, useCart } from "@/lib/store";
import { track } from "@/lib/personaforge-sdk";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your cart — Bazaar" }] }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);

  const items = cart.map((c, idx) => ({ ...c, idx, product: getProduct(c.productId) })).filter((x) => x.product);
  const subtotal = items.reduce((s, x) => s + (x.product!.priceCents * x.qty), 0);
  const shipping = subtotal > 10000 || subtotal === 0 ? 0 : 800;
  const discountCents = Math.round(subtotal * discount);
  const total = Math.max(0, subtotal + shipping - discountCents);

  if (!items.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl">Your cart is empty.</h1>
        <p className="mt-3 text-sm text-muted-foreground">Browse the collection — your future favorites are waiting.</p>
        <Link to="/products" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
          Shop the collection
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_400px] lg:px-8">
      <div>
        <h1 className="font-display text-4xl">Your cart</h1>
        <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
          {items.map((x) => (
            <div key={`${x.idx}`} className="flex gap-4 p-5">
              <Link to="/products/$id" params={{ id: x.product!.id }} className="aspect-square h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-cream">
                <img src={x.product!.images[0]} alt="" className="h-full w-full object-cover" />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">{x.product!.brand}</div>
                    <Link to="/products/$id" params={{ id: x.product!.id }} className="text-base font-medium hover:underline">
                      {x.product!.name}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground">Size {x.size} · {x.color}</div>
                  </div>
                  <button
                    aria-label="Remove"
                    onClick={() => {
                      removeFromCart(x.idx);
                      track("remove_from_cart", { productId: x.productId });
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex items-end justify-between">
                  <div className="flex items-center gap-1 rounded-full border border-border p-1">
                    <button onClick={() => updateCartQty(x.idx, x.qty - 1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent">
                      <Minus className="h-3 w-3" />
                    </button>
                    <div className="w-6 text-center text-sm">{x.qty}</div>
                    <button onClick={() => updateCartQty(x.idx, x.qty + 1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="font-semibold">{formatPrice(x.product!.priceCents * x.qty)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl">Order summary</h2>

        <div className="mt-5 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Discount code"
            className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => {
              if (code === "BAZAAR10") {
                setDiscount(0.1);
                toast.success("10% applied.");
              } else {
                setDiscount(0);
                toast.error("Invalid code. Try BAZAAR10.");
              }
            }}
            className="rounded-full bg-foreground px-4 text-sm font-medium text-background"
          >
            Apply
          </button>
        </div>

        <div className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span></div>
          {discountCents > 0 && (
            <div className="flex justify-between text-coral"><span>Discount (BAZAAR10)</span><span>− {formatPrice(discountCents)}</span></div>
          )}
          <div className="my-3 border-t border-border" />
          <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatPrice(total)}</span></div>
        </div>

        <Link
          to="/checkout"
          onClick={() => track("checkout_start", { total })}
          className="mt-6 flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Proceed to checkout
        </Link>
        <Link to="/products" className="mt-3 block text-center text-xs text-muted-foreground hover:underline">
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
