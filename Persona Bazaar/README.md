# Bazaar — PersonaForge demo storefront

An editorial fashion & lifestyle store that fires real-time behavioral events to
PersonaForge and personalizes its homepage from PersonaForge's response.

Built on **TanStack Start v1** (React 19 + Vite). This is the Lovable
equivalent of the requested Next.js 14 App Router stack — the route file
structure mirrors `app/` paths.

## Environment variables

These are stored as Lovable Cloud project secrets (read on the server, exposed
to the browser via a tiny `getPublicConfig` server function). The unprefixed
names are required — `VITE_` prefixes are reserved by Lovable:

| Secret                     | Equivalent NEXT_PUBLIC name   |
| -------------------------- | ----------------------------- |
| `PUBLIC_SUPABASE_URL`      | `NEXT_PUBLIC_SUPABASE_URL`    |
| `PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `PERSONAFORGE_URL`         | `NEXT_PUBLIC_PERSONAFORGE_URL` |
| `PERSONAFORGE_KEY`         | `NEXT_PUBLIC_PERSONAFORGE_KEY` |

## PersonaForge wiring

`src/lib/personaforge-sdk.ts`:

- Generates a stable `bazaar:user_id` in `localStorage`.
- `track(event, payload)` batches to `POST {URL}/api/events/public` with the
  `x-personaforge-key` header. Flushed on visibility-change for reliability.
- `fetchPersonalization()` hits `GET {URL}/api/personalize/public?userId=…`.
- React hook `usePersonalization()` (cached 5 min) powers the homepage
  **Personalized For You** section — persona name, tagline, headline, CTA, and
  `recommended_product_ids` map to live product cards.
- No-ops gracefully when env vars are missing.

Auto-tracked events: `page_view`, `category_browse`, `search`, `product_view`,
`add_to_cart`, `remove_from_cart`, `wishlist_add`, `checkout_start`,
`purchase`, `review_view`, `scroll` (25/50/75/100 buckets).

## Supabase

Schema lives in **`migrations/0001_bazaar.sql`** — run it once in your Supabase
SQL editor. It scaffolds: `categories`, `products`, `product_images`,
`product_variants`, `profiles`, `user_roles` + `has_role()`, `cart_items`,
`wishlist_items`, `orders`, `order_items`, `reviews`,
`personalization_snapshots`, `featured_promotions`, `newsletter_subscribers`.
All public-schema tables have explicit `GRANT`s, RLS enabled, and policies.

The Supabase JS client is configured at runtime from the public config and
used for email/password auth on the `/account` page. The demo catalog runs
from `src/lib/products.ts` so the store works the moment you load it; the
schema is ready when you want to switch reads to Supabase.

## Routes

```
/                       homepage (hero, categories, new arrivals, urgency,
                        trending, personalized, social proof, newsletter)
/products?cat=&sort=&min=&max=  listing with filters
/products/:id           product detail with variants, reviews, related
/cart                   persistent cart with discount code (BAZAAR10)
/checkout               3-step shipping → payment → review (mock Stripe UI)
/search?q=              search results
/categories/:slug       category landing
/account                Supabase email/password sign in
/wishlist               saved pieces
```

## Run

The dev server starts automatically. Visit the preview URL.
