import { useState } from "react";
import { toast } from "sonner";

export function Newsletter() {
  const [email, setEmail] = useState("");
  return (
    <section className="grid gap-6 rounded-3xl border border-border bg-card p-8 sm:grid-cols-2 sm:p-12">
      <div>
        <h2 className="font-display text-3xl sm:text-4xl">Letters from the atelier.</h2>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Quiet emails — once a fortnight. New arrivals, in-studio reads, occasional discounts.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!email) return;
          toast.success("Subscribed — welcome to the Bazaar letter.");
          setEmail("");
        }}
        className="flex h-fit items-center gap-2 self-end rounded-full border border-border bg-background p-1.5"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="h-10 flex-1 bg-transparent px-4 text-sm outline-none"
        />
        <button
          type="submit"
          className="h-10 shrink-0 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Subscribe
        </button>
      </form>
    </section>
  );
}
