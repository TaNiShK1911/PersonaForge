import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

const SLIDES = [
  {
    eyebrow: "Autumn 25",
    title: "Soft tailoring,\nslowly considered.",
    sub: "The new editorial collection — Belgian linen, Italian wool, deep indigo dye.",
    cta: "Shop the collection",
    href: "/products",
    image:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2200&q=80",
  },
  {
    eyebrow: "Newly arrived",
    title: "Knitwear for\nlong evenings.",
    sub: "Alpaca, lambswool, cashmere — sourced from small mills across Europe.",
    cta: "Browse knitwear",
    href: "/categories/women",
    image:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=2200&q=80",
  },
  {
    eyebrow: "Atelier Noir",
    title: "Tailoring,\nwithout the stiffness.",
    sub: "A capsule of soft-shouldered jackets and pleated trousers, made in Porto.",
    cta: "Shop tailoring",
    href: "/categories/men",
    image:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=2200&q=80",
  },
];

export function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 6500);
    return () => clearInterval(t);
  }, []);
  const s = SLIDES[i];

  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-ink">
      <div className="relative aspect-[16/9] min-h-[480px] md:min-h-[600px]">
        {SLIDES.map((slide, idx) => (
          <img
            key={slide.image}
            src={slide.image}
            alt=""
            className={`ken-burns absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              idx === i ? "opacity-90" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/30 to-transparent" />
        <div className="relative z-10 flex h-full max-w-7xl flex-col justify-end px-6 pb-12 pt-10 text-white sm:px-10 sm:pb-16 md:pb-20">
          <div key={i} className="reveal max-w-xl">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              {s.eyebrow}
            </div>
            <h1 className="mt-4 whitespace-pre-line font-display text-4xl font-medium leading-[1.05] sm:text-6xl">
              {s.title}
            </h1>
            <p className="mt-5 max-w-md text-base text-white/80">{s.sub}</p>
            <Link
              to={s.href}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-ink transition hover:bg-coral hover:text-coral-foreground"
            >
              {s.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 flex gap-2">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Slide ${idx + 1}`}
                onClick={() => setI(idx)}
                className={`h-1 rounded-full transition-all ${
                  idx === i ? "w-10 bg-white" : "w-5 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
