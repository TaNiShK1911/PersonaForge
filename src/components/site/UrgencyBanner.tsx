import { Flame } from "lucide-react";

export function UrgencyBanner() {
  return (
    <section className="rounded-3xl bg-ink px-6 py-8 text-white sm:px-10 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral text-coral-foreground">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-2xl">Trending now</div>
            <div className="text-sm text-white/70">142 people are viewing the new collection.</div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm text-white/80">
          <div><span className="font-semibold text-white">2 hrs</span> free shipping</div>
          <div className="hidden sm:block">·</div>
          <div><span className="font-semibold text-white">Free</span> returns 30 days</div>
        </div>
      </div>
    </section>
  );
}
