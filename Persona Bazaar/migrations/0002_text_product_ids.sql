-- Migrate older Bazaar deployments where product_id was uuid + FK to public.products.
-- Switches cart_items/wishlist_items/order_items to text product_id so the demo
-- mock catalog works without first seeding public.products. Idempotent.

alter table if exists public.cart_items
  drop constraint if exists cart_items_product_id_fkey,
  drop constraint if exists cart_items_variant_id_fkey;
alter table if exists public.cart_items
  alter column product_id type text using product_id::text;
alter table if exists public.cart_items add column if not exists size text;
alter table if exists public.cart_items add column if not exists color text;
alter table if exists public.cart_items drop column if exists variant_id;

alter table if exists public.wishlist_items
  drop constraint if exists wishlist_items_product_id_fkey;
alter table if exists public.wishlist_items
  alter column product_id type text using product_id::text;

alter table if exists public.order_items
  drop constraint if exists order_items_product_id_fkey,
  drop constraint if exists order_items_variant_id_fkey;
alter table if exists public.order_items
  alter column product_id type text using product_id::text;
alter table if exists public.order_items add column if not exists size text;
alter table if exists public.order_items add column if not exists color text;
alter table if exists public.order_items add column if not exists name text;
alter table if exists public.order_items drop column if exists variant_id;
