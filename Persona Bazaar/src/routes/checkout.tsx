import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
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

function CheckoutPage() {
  const cart = useCart();
  const [done, setDone] = useState(false);
  const [placing, setPlacing] = useState(false);
  const hasPlaced = useRef(false);

  const items = cart.map((c) => ({ ...c, product: getProduct(c.productId)! })).filter((i) => i.product);
  const subtotal = items.reduce((s, x) => s + x.product.priceCents * x.qty, 0);
  const shipping = subtotal > 10000 || subtotal === 0 ? 0 : 800;
  const tax = Math.round(subtotal * 0.08);
  const total = subtotal + shipping + tax;

  useEffect(() => {
    if (items.length > 0 && !hasPlaced.current && !done) {
      hasPlaced.current = true;
      setPlacing(true);
      
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
        shippingAddress: { name: "Demo User", email: "demo@personaforge.com", address: "123 Demo St", city: "Demo City", zip: "12345", country: "USA" },
      };

      createOrder(orderInput)
        .then((res) => {
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
          toast.success("Order placed automatically for demonstration.");
        })
        .catch((e) => {
          toast.error("Something went wrong placing your order.");
          console.error(e);
        })
        .finally(() => {
          setPlacing(false);
        });
    }
  }, [items, subtotal, shipping, total, done]);

  if (placing) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Placing order...</h1>
      </div>
    );
  }

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

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl">Nothing to check out yet.</h1>
      <Link to="/products" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
        Browse the shop
      </Link>
    </div>
  );
}
