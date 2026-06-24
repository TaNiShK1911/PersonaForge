import { Link } from "@tanstack/react-router";
import { Heart, Search, ShoppingBag, User } from "lucide-react";
import { useCart, useWishlist } from "@/lib/store";
import { useState } from "react";
import { CATEGORIES } from "@/lib/products";

export function Header() {
  const cart = useCart();
  const wishlist = useWishlist();
  const [q, setQ] = useState("");
  const cartCount = cart.reduce((n, i) => n + i.qty, 0);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="font-display text-2xl font-semibold tracking-tight text-primary">
          Bazaar
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to="/categories/$slug"
              params={{ slug: c.slug }}
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              {c.name}
            </Link>
          ))}
          <Link
            to="/products"
            className="text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            Shop all
          </Link>
        </nav>
        <form
          action="/search"
          method="get"
          className="ml-auto flex flex-1 items-center gap-2 sm:max-w-xs"
        >
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the store"
              className="h-9 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </form>
        <div className="flex items-center gap-1">
          <Link
            to="/wishlist"
            aria-label="Wishlist"
            className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent"
          >
            <Heart className="h-4 w-4" />
            {wishlist.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-medium text-coral-foreground">
                {wishlist.length}
              </span>
            )}
          </Link>
          <Link
            to="/account"
            aria-label="Account"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent"
          >
            <User className="h-4 w-4" />
          </Link>
          <Link
            to="/cart"
            aria-label="Cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent"
          >
            <ShoppingBag className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
