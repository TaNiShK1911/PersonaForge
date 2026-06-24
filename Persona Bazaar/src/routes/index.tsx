import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/site/Hero";
import { CategoryTiles } from "@/components/site/CategoryTiles";
import { ProductGrid } from "@/components/site/ProductGrid";
import { SectionHeading } from "@/components/site/SectionHeading";
import { UrgencyBanner } from "@/components/site/UrgencyBanner";
import { SocialProof } from "@/components/site/SocialProof";
import { Newsletter } from "@/components/site/Newsletter";
import { PersonalizedSection } from "@/components/site/PersonalizedSection";
import { newArrivals, trending } from "@/lib/products";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bazaar — Considered fashion & home" },
      { name: "description", content: "An editorial shop for slowly-made fashion, accessories and home objects, personalized in real time." },
      { property: "og:title", content: "Bazaar" },
      { property: "og:description", content: "Considered fashion & home, personalized for you." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-20 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <Hero />

      <section>
        <SectionHeading eyebrow="Departments" title="Where to begin." />
        <CategoryTiles />
      </section>

      <section>
        <SectionHeading
          eyebrow="New arrivals"
          title="Just landed."
          action={
            <Link to="/products" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              See all
            </Link>
          }
        />
        <ProductGrid items={newArrivals()} eager />
      </section>

      <UrgencyBanner />

      <section>
        <SectionHeading
          eyebrow="Trending"
          title="Selling fast."
          action={
            <Link to="/products" search={{ sort: "rating" }} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Shop trending
            </Link>
          }
        />
        <ProductGrid items={trending()} />
      </section>

      <PersonalizedSection />

      <SocialProof />

      <Newsletter />
    </div>
  );
}
