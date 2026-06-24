const QUOTES = [
  { q: "The cashmere crewneck is the softest I’ve ever owned. It hasn’t left my body since November.", a: "Vogue Editor" },
  { q: "Bazaar feels like the editorial concept store I’ve been missing.", a: "Cereal Magazine" },
  { q: "Slow-made, deeply considered — the things you actually want to wear forever.", a: "Monocle" },
];

export function SocialProof() {
  return (
    <section className="grid gap-6 rounded-3xl bg-cream/50 p-8 sm:grid-cols-3 sm:p-10">
      {QUOTES.map((it) => (
        <figure key={it.a}>
          <blockquote className="font-display text-lg leading-snug text-foreground">“{it.q}”</blockquote>
          <figcaption className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            — {it.a}
          </figcaption>
        </figure>
      ))}
    </section>
  );
}
