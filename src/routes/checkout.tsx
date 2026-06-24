import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, CreditCard, Truck, FileText } from "lucide-react";
import { getProduct } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { clearCart, useCart } from "@/lib/store";
import { track } from "@/lib/personaforge-sdk";
import { createOrder } from "@/lib/persistence";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Bazaar" }] }),
  component: CheckoutPage,
});

const STEPS = [
  { key: "ship", label: "Shipping", Icon: Truck },
  { key: "pay", label: "Payment", Icon: CreditCard },
  { key: "review", label: "Review", Icon: FileText },
] as const;

function CheckoutPage() {
  const cart = useCart();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [placing, setPlacing] = useState(false);

  const [ship, setShip] = useState({ name: "", email: "", address: "", city: "", zip: "", country: "USA" });
  const [pay, setPay] = useState({ card: "", exp: "", cvc: "", zip: "" });

  const items = cart.map((c) => ({ ...c, product: getProduct(c.productId)! })).filter((i) => i.product);
  const subtotal = items.reduce((s, x) => s + x.product.priceCents * x.qty, 0);
  const shipping = subtotal > 10000 || subtotal === 0 ? 0 : 800;
  const tax = Math.round(subtotal * 0.08);
  const total = subtotal + shipping + tax;

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="mt-6 font-display text-4xl">Your order is in.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We’ve emailed your confirmation. Thank you for shopping Bazaar.
        </p>
        <Link to="/products" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
          Continue shopping
        </Link>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Nothing to check out yet.</h1>
        <Link to="/products" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
          Browse the shop
        </Link>
      </div>
    );
  }

  function formatCard(v: string) {
    return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_400px] lg:px-8">
      <div>
        <h1 className="font-display text-4xl">Checkout</h1>

        {/* Stepper */}
        <div className="mt-8 flex items-center gap-3">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex flex-1 items-center gap-3">
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border-2",
                i <= step ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
              )}>
                <s.Icon className="h-4 w-4" />
              </div>
              <div className={cn("text-sm font-medium", i <= step ? "text-foreground" : "text-muted-foreground")}>{s.label}</div>
              {i < STEPS.length - 1 && <div className={cn("h-px flex-1", i < step ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
          {step === 0 && (
            <form
              onSubmit={(e) => { e.preventDefault(); setStep(1); }}
              className="grid gap-4 sm:grid-cols-2"
            >
              <Field label="Full name" value={ship.name} onChange={(v) => setShip({ ...ship, name: v })} required />
              <Field label="Email" type="email" value={ship.email} onChange={(v) => setShip({ ...ship, email: v })} required />
              <Field label="Address" value={ship.address} onChange={(v) => setShip({ ...ship, address: v })} required className="sm:col-span-2" />
              <Field label="City" value={ship.city} onChange={(v) => setShip({ ...ship, city: v })} required />
              <Field label="ZIP / Postal" value={ship.zip} onChange={(v) => setShip({ ...ship, zip: v })} required />
              <Field label="Country" value={ship.country} onChange={(v) => setShip({ ...ship, country: v })} required className="sm:col-span-2" />
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
                  Continue to payment
                </button>
              </div>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Card</div>
                <div className="mt-2 flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <input
                    required
                    value={pay.card}
                    onChange={(e) => setPay({ ...pay, card: formatCard(e.target.value) })}
                    placeholder="1234 1234 1234 1234"
                    className="h-10 flex-1 bg-transparent text-base outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Expiry" value={pay.exp} onChange={(v) => setPay({ ...pay, exp: v.replace(/[^\d/]/g, "").slice(0, 5) })} placeholder="MM/YY" required />
                <Field label="CVC" value={pay.cvc} onChange={(v) => setPay({ ...pay, cvc: v.replace(/\D/g, "").slice(0, 4) })} placeholder="123" required />
                <Field label="ZIP" value={pay.zip} onChange={(v) => setPay({ ...pay, zip: v })} placeholder="10001" required />
              </div>
              <p className="text-xs text-muted-foreground">
                This is a demo store — no real charges will be made.
              </p>
              <div className="flex justify-between">
                <button type="button" onClick={() => setStep(0)} className="text-sm text-muted-foreground hover:underline">
                  ← Back to shipping
                </button>
                <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
                  Review order
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Shipping to</div>
                <div className="mt-1 text-sm">{ship.name} · {ship.address}, {ship.city} {ship.zip}, {ship.country}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Paying with</div>
                <div className="mt-1 text-sm">Card ending in {pay.card.slice(-4)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Items</div>
                <ul className="mt-2 divide-y divide-border">
                  {items.map((x, i) => (
                    <li key={i} className="flex justify-between py-2 text-sm">
                      <span>{x.product.name} · {x.size}/{x.color} × {x.qty}</span>
                      <span>{formatPrice(x.product.priceCents * x.qty)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="text-sm text-muted-foreground hover:underline">← Edit payment</button>
                <button
                  disabled={placing}
                  onClick={async () => {
                    setPlacing(true);
                    try {
                      const orderInput = {
                        items: items.map((x) => ({
                          productId: x.productId,
                          name: x.product.name,
                          size: x.size,
                          color: x.color,
                          qty: x.qty,
                          priceCents: x.product.priceCents,
                        })),
                        subtotalCents: subtotal,
                        shippingCents: shipping,
                        totalCents: total,
                        shippingAddress: ship as unknown as Record<string, unknown>,
                      };
                      const res = await createOrder(orderInput);
                      if (res.error) {
                        toast.error("Couldn’t save order: " + res.error);
                        setPlacing(false);
                        return;
                      }
                      track("purchase", {
                        orderId: res.orderId,
                        guest: res.guest,
                        total,
                        items: items.map((x) => ({ productId: x.productId, qty: x.qty, priceCents: x.product.priceCents })),
                      });
                      clearCart();
                      setDone(true);
                      toast.success(res.guest ? "Order placed (guest)." : "Order placed!");
                    } catch (e) {
                      toast.error("Something went wrong placing your order.");
                      console.error(e);
                    } finally {
                      setPlacing(false);
                    }
                  }}
                  className="rounded-full bg-coral px-6 py-3 text-sm font-medium text-coral-foreground disabled:opacity-60"
                >
                  {placing ? "Placing…" : `Place order · ${formatPrice(total)}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl">Summary</h2>
        <div className="mt-4 space-y-2 text-sm">
          <Row label="Subtotal" value={formatPrice(subtotal)} />
          <Row label="Shipping" value={shipping === 0 ? "Free" : formatPrice(shipping)} />
          <Row label="Tax (est.)" value={formatPrice(tax)} />
          <div className="my-2 border-t border-border" />
          <Row label="Total" value={formatPrice(total)} bold />
        </div>
        <div className="mt-6 rounded-xl bg-cream/60 p-4 text-xs text-muted-foreground">
          Need help? Reply to your confirmation email and we’ll respond within an hour.
        </div>
      </aside>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, placeholder, className,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string; className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between", bold && "text-base font-semibold")}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
