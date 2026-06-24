import { Link } from "@tanstack/react-router";
import { CATEGORIES } from "@/lib/products";
import { track } from "@/lib/personaforge-sdk";

export function CategoryTiles() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CATEGORIES.map((c) => (
        <Link
          key={c.slug}
          to="/categories/$slug"
          params={{ slug: c.slug }}
          onClick={() => track("category_browse", { slug: c.slug })}
          className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-cream"
        >
          <img
            src={c.image}
            alt={c.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
            <div className="font-display text-2xl">{c.name}</div>
            <div className="mt-1 text-xs text-white/80">{c.tagline}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
