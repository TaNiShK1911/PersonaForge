import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut, User as UserIcon, Package } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { getUserId } from "@/lib/personaforge-sdk";
import { loadMyOrders } from "@/lib/persistence";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Account — Bazaar" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, ready, supabase } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const orders = useQuery({
    queryKey: ["orders", user?.id ?? "none"],
    queryFn: loadMyOrders,
    enabled: !!user && !!supabase,
    staleTime: 30_000,
  });

  if (!ready) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <UserIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl">Welcome back.</h1>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link to="/wishlist" className="rounded-2xl border border-border bg-card p-6 hover:border-primary">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Wishlist</div>
            <div className="mt-1 font-display text-xl">Saved pieces</div>
          </Link>
          <Link to="/cart" className="rounded-2xl border border-border bg-card p-6 hover:border-primary">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cart</div>
            <div className="mt-1 font-display text-xl">In your bag</div>
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Package className="h-3.5 w-3.5" /> Order history
          </div>
          <div className="mt-4">
            {orders.isLoading && <div className="text-sm text-muted-foreground">Loading orders…</div>}
            {orders.data && orders.data.length === 0 && (
              <div className="text-sm text-muted-foreground">No orders yet — your first purchase will land here.</div>
            )}
            <ul className="divide-y divide-border">
              {(orders.data ?? []).map((o) => (
                <li key={o.id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">Order #{o.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString()} · {o.status} · {o.items.length} item{o.items.length === 1 ? "" : "s"}
                      </div>
                      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        {o.items.slice(0, 4).map((it) => (
                          <li key={it.id}>{it.name ?? it.product_id} × {it.qty}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-sm font-semibold">{formatPrice(o.total_cents)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            PersonaForge user id
          </div>
          <code className="mt-2 block break-all rounded-lg bg-cream/60 p-3 text-xs">{getUserId()}</code>
          <p className="mt-2 text-xs text-muted-foreground">
            All your browse, cart, and purchase events are streamed to PersonaForge under this id.
          </p>
        </div>

        <button
          onClick={async () => {
            await supabase?.auth.signOut();
            toast("Signed out.");
          }}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm hover:bg-accent"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl">{mode === "in" ? "Sign in" : "Create your account"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {supabase
          ? "Save your wishlist, view orders, and pick up where you left off."
          : "Supabase isn’t configured yet — add NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY to enable sign-in."}
      </p>

      <form
        className="mt-8 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!supabase) return;
          setBusy(true);
          try {
            if (mode === "in") {
              const { error } = await supabase.auth.signInWithPassword({ email, password });
              if (error) toast.error(error.message);
              else toast.success("Signed in.");
            } else {
              const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: window.location.origin + "/account" },
              });
              if (error) toast.error(error.message);
              else toast.success("Account created. Check your email to confirm.");
            }
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          required type="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
        />
        <input
          required type="password" placeholder="Password" minLength={6}
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
        />
        <button
          disabled={busy || !supabase}
          className="h-11 w-full rounded-full bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "in" ? "up" : "in")}
        className="mt-4 w-full text-center text-xs text-muted-foreground hover:underline"
      >
        {mode === "in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>

      <div className="mt-10 rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
        Your PersonaForge anonymous id: <code className="break-all">{getUserId()}</code>
      </div>
    </div>
  );
}
