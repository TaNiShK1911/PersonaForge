
# Bazaar — Editorial Fashion Storefront

A polished, production-quality demo storefront that fires real-time events to PersonaForge and personalizes its homepage from PersonaForge's response. Built on this project's TanStack Start stack (the closest equivalent to Next.js 14 App Router available here) with email/password auth and an external Supabase backend you control.

## Stack

- TanStack Start v1 (React 19, Vite 7, file-based routing) — replaces Next.js App Router
- TypeScript strict
- Tailwind v4 + shadcn/ui (already in project)
- External Supabase via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (+ server-side `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`)
- PersonaForge via `VITE_PERSONAFORGE_URL` / `VITE_PERSONAFORGE_KEY` (client-side, since events fire from the browser)

Env-var note: Lovable/Vite client vars must be `VITE_`-prefixed, not `NEXT_PUBLIC_`. I'll document both names in README and read the `VITE_` ones in code.

## Routes (file-based, equivalent to your Next paths)

```
src/routes/
  __root.tsx                 layout: header, footer, cart drawer, toast, PersonaForge bootstrap
  index.tsx                  /                  homepage
  products.tsx               /products          listing (search, filters, sort, grid)
  products.$id.tsx           /products/:id      detail
  cart.tsx                   /cart
  checkout.tsx               /checkout          multi-step
  search.tsx                 /search?q=
  categories.$slug.tsx       /categories/:slug
  _authenticated/route.tsx   gate (managed)
  _authenticated/account.tsx /account
  _authenticated/wishlist.tsx/wishlist
  auth.tsx                   /auth              email/password sign in + sign up
```

All public route loaders use TanStack Query (`ensureQueryData` + `useSuspenseQuery`); every route sets `head()` (title/description/og). No `Route.useRouter()` misuse; every loader-bearing route has `errorComponent` + `notFoundComponent`.

## Homepage composition

1. Rotating editorial hero (3 slides, autoplay + manual), CTA → /products
2. Featured categories tiles: Women / Men / Accessories / Home
3. New Arrivals — 8-product grid
4. Trending Now / urgency banner ("Selling fast — 142 viewing")
5. **Personalized For You** — driven by PersonaForge response:
   - persona name + tagline + custom headline + CTA
   - 6 recommended products from PersonaForge `recommended_product_ids`
   - graceful default state (curated picks + "Personalizing your store…") when no response yet
6. Social proof (press logos + review quotes)
7. Newsletter signup (writes to `newsletter_subscribers` table)

## PersonaForge SDK — `src/lib/personaforge-sdk.ts`

- Stable anonymous `userId` in `localStorage` (`bazaar:user_id`, generated via `crypto.randomUUID`)
- `track(event, payload)` → `POST {URL}/api/events/public` with header `x-personaforge-key`, batched (debounced 300ms, flushed on `visibilitychange`)
- `personalize()` → `GET {URL}/api/personalize/public?userId=…`
- React hook `usePersonalization()` (TanStack Query, cached 5min, refetches on identity change)
- Auto-tracked events: `page_view` (router subscription), `scroll` (throttled 1s, depth buckets), `category_browse`, `search`, `product_view`, `add_to_cart`, `remove_from_cart`, `wishlist_add`, `checkout_start`, `purchase`, `review_view`
- Silent no-op + console.info when env vars are missing (won't break the UI)
- Browser-only — guarded with `typeof window` checks, initialized from `__root.tsx` via `useEffect`

## Supabase integration

Client setup:
- `src/integrations/supabase/client.ts` — browser client (already convention)
- `src/lib/*.functions.ts` — server functions for catalog reads, cart/wishlist/order writes
- `src/integrations/supabase/auth-middleware.ts` for protected fns (account, wishlist, orders)
- Bearer attached automatically via `attachSupabaseAuth` in `src/start.ts`

Schema (SQL migration scaffolded for you to run against your external Supabase):

```
categories(id, slug, name, hero_image, sort_order)
products(id, slug, name, description, price_cents, compare_at_cents,
         category_id, brand, is_new, is_trending, rating, review_count, created_at)
product_images(id, product_id, url, alt, position)
product_variants(id, product_id, size, color, sku, stock, price_cents_override)
profiles(id ↔ auth.users, full_name, avatar_url, default_address jsonb)
cart_items(id, user_id, product_id, variant_id, qty, created_at)  -- unique(user_id, variant_id)
wishlist_items(id, user_id, product_id, created_at)               -- unique(user_id, product_id)
orders(id, user_id, status, subtotal_cents, shipping_cents, total_cents,
       shipping_address jsonb, created_at)
order_items(id, order_id, product_id, variant_id, qty, price_cents)
reviews(id, product_id, user_id, rating, title, body, created_at)
personalization_snapshots(id, user_id, persona, payload jsonb, created_at)
featured_promotions(id, slot, title, subtitle, image_url, link, active, sort_order)
newsletter_subscribers(id, email, created_at)
app_role enum + user_roles(id, user_id, role) + has_role() SECURITY DEFINER fn
```

Every table: explicit `GRANT`s, RLS enabled, policies — public SELECT for `categories/products/product_images/product_variants/reviews/featured_promotions`; user-scoped policies (`auth.uid() = user_id`) for cart/wishlist/orders/profiles/personalization_snapshots. Seed 24 demo products + 4 categories + 12 reviews + 3 hero promotions.

Cart strategy: signed-in users persist to `cart_items`; anonymous users use `localStorage` and the cart auto-merges on sign-in.

## Listing, detail, cart, checkout

- `/products`: debounced search input, category multi-select, price range slider, sort (newest / price asc / price desc / rating), responsive grid, hover quick-add + wishlist toggle
- `/products/:id`: image gallery (thumb rail + main), size/color variant matrix with stock awareness, qty stepper, add-to-cart, wishlist, urgency badge ("Only 3 left"), tabbed Description / Details / Shipping, reviews (list + write-review form for signed-in users), Related (same category) + Customers Also Bought (collaborative mock based on category co-occurrence)
- `/cart`: line items with image + variant, qty steppers, remove, discount code field (mock validates `BAZAAR10` → 10% off), order summary, "Proceed to checkout"
- `/checkout`: three steps — Shipping → Payment → Review, with stepper UI. Polished mock Stripe-style payment form (card number formatter, expiry, CVC, ZIP) — no real charges. On confirm: insert `orders` + `order_items`, clear cart, fire `purchase` event, redirect to `/checkout/success?order=…` (rendered via a `checkout.success.tsx` route).

## Auth (email/password only, per your choice)

- `/auth` with tabbed sign in / sign up; redirects to previous route after auth
- Supabase `onAuthStateChange` wired once in `__root.tsx`, filtered to `SIGNED_IN`/`SIGNED_OUT`/`USER_UPDATED`
- `/account`, `/wishlist`, `/checkout` placed under `_authenticated/` so unauthenticated users are redirected to `/auth`. (`/checkout` allows guest? Will keep behind auth for simplicity — can revisit.)

## Design system

- Deep indigo primary, warm coral accent, ivory background, charcoal text — defined as `oklch` tokens in `src/styles.css` under `@theme inline` and consumed via shadcn variants
- Display serif (Fraunces) + clean sans (Inter), loaded via `<link>` in `__root.tsx`
- Generous spacing, large editorial type for hero/section titles, soft shadows, rounded-2xl cards, subtle hover lift, ken-burns hero image transitions, fade-in section reveals (CSS only, no JS animation deps)
- Mobile-first; sticky bottom CTA on product detail for mobile

## Engineering guarantees

- No dead links, no placeholder buttons — every CTA wires to a real route or action
- Server/client separation enforced (browser-only PersonaForge SDK; server-fn DB access)
- Reusable components: `ProductCard`, `ProductGrid`, `PriceTag`, `VariantPicker`, `QuantityStepper`, `SectionHeading`, `Hero`, `CategoryTile`, `PersonalizedSection`, `CartDrawer`, `ReviewList`, `StepIndicator`
- Loading/empty/error states everywhere
- Toasts for cart/wishlist actions

## Setup you'll do once

1. After build, add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PERSONAFORGE_URL`, `VITE_PERSONAFORGE_KEY` via the Secrets prompt I'll trigger
2. Run the generated `migrations/0001_bazaar.sql` against your Supabase project (I'll include a one-shot script + a Supabase Studio SQL paste-block in README)
3. Open the preview — store boots with anonymous user, fires events, personalizes when PersonaForge responds

## Out of scope for this build

- Real payment processing (mock Stripe UI only)
- Google/Apple OAuth (email/password per your choice)
- Admin/CMS for products (seed migration only)
- SSR-rendered personalized section (personalization is per-user → fetched client-side after hydration, with a stable fallback to avoid hydration mismatch)
