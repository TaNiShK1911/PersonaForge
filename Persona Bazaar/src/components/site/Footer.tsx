import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-cream/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="font-display text-2xl text-primary">Bazaar</div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            An editorial shop for considered fashion and home. Slowly made, deeply loved.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Shop</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/categories/$slug" params={{ slug: "women" }} className="hover:underline">Women</Link></li>
            <li><Link to="/categories/$slug" params={{ slug: "men" }} className="hover:underline">Men</Link></li>
            <li><Link to="/categories/$slug" params={{ slug: "accessories" }} className="hover:underline">Accessories</Link></li>
            <li><Link to="/categories/$slug" params={{ slug: "home" }} className="hover:underline">Home</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Help</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/account" className="hover:underline">Your account</Link></li>
            <li><Link to="/wishlist" className="hover:underline">Wishlist</Link></li>
            <li><Link to="/cart" className="hover:underline">Cart</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">About</div>
          <p className="mt-3 text-sm text-muted-foreground">
            Demo storefront for PersonaForge. Every interaction here is forwarded to your PersonaForge instance.
          </p>
        </div>
      </div>
      <div className="border-t border-border/70 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Bazaar · Made for PersonaForge
      </div>
    </footer>
  );
}
