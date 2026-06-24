import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { CATEGORIES, productsByCategory } from "@/lib/products";
import { ProductGrid } from "@/components/site/ProductGrid";
import { track } from "@/lib/personaforge-sdk";

export const Route = createFileRoute("/categories/$slug")({
  loader: ({ params }) => {
    const cat = CATEGORIES.find((c) => c.slug === params.slug);
    if (!cat) throw notFound();
    return { cat, items: productsByCategory(params.slug) };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.cat.name} — Bazaar` },
          { name: "description", content: loaderData.cat.tagline },
          { property: "og:title", content: `${loaderData.cat.name} — Bazaar` },
          { property: "og:image", content: loaderData.cat.image },
        ]
      : [{ title: "Category — Bazaar" }],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl">Category not found.</h1>
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-12 text-center text-sm">{error.message}</div>,
  component: CategoryPage,
});

function CategoryPage() {
  const { cat, items } = Route.useLoaderData();
  useEffect(() => { track("category_browse", { slug: cat.slug }); }, [cat.slug]);

  return (
    <div>
      <section className="relative isolate overflow-hidden">
        <div className="relative aspect-[21/9] min-h-[280px] w-full">
          <img src={cat.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/70 to-transparent" />
          <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-4 pb-10 text-white sm:px-6 lg:px-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Bazaar · {cat.name}</div>
              <h1 className="mt-2 font-display text-5xl sm:text-6xl">{cat.name}</h1>
              <p className="mt-3 max-w-md text-sm text-white/85">{cat.tagline}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ProductGrid items={items} eager />
      </div>
    </div>
  );
}
