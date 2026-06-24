-- Bazaar — Supabase schema (run once against your external Supabase project).
-- All public.* tables have explicit GRANTs and RLS policies.

create extension if not exists "pgcrypto";

-- ===== Roles =====
do $$ begin
  create type public.app_role as enum ('admin', 'customer');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "user reads own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ===== Catalog =====
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  hero_image text,
  sort_order int default 0
);
grant select on public.categories to anon, authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "public read categories" on public.categories for select to anon, authenticated using (true);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  brand text,
  price_cents int not null,
  compare_at_cents int,
  category_id uuid references public.categories(id) on delete set null,
  is_new boolean default false,
  is_trending boolean default false,
  rating numeric(2,1) default 4.5,
  review_count int default 0,
  stock int default 0,
  tags text[] default '{}',
  created_at timestamptz default now()
);
grant select on public.products to anon, authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read products" on public.products for select to anon, authenticated using (true);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text,
  position int default 0
);
grant select on public.product_images to anon, authenticated;
grant all on public.product_images to service_role;
alter table public.product_images enable row level security;
create policy "public read images" on public.product_images for select to anon, authenticated using (true);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text,
  color text,
  sku text,
  stock int default 0,
  price_cents_override int
);
grant select on public.product_variants to anon, authenticated;
grant all on public.product_variants to service_role;
alter table public.product_variants enable row level security;
create policy "public read variants" on public.product_variants for select to anon, authenticated using (true);

-- ===== Profiles =====
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  default_address jsonb,
  created_at timestamptz default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "users upsert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Cart, Wishlist, Orders =====
-- product_id is stored as text (slug or uuid) so the demo mock catalog works
-- without needing to first seed public.products.
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  size text,
  color text,
  qty int not null check (qty > 0),
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.cart_items to authenticated;
grant all on public.cart_items to service_role;
alter table public.cart_items enable row level security;
create policy "cart owner all" on public.cart_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  created_at timestamptz default now(),
  unique (user_id, product_id)
);
grant select, insert, delete on public.wishlist_items to authenticated;
grant all on public.wishlist_items to service_role;
alter table public.wishlist_items enable row level security;
create policy "wishlist owner all" on public.wishlist_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'paid',
  subtotal_cents int not null,
  shipping_cents int not null,
  total_cents int not null,
  shipping_address jsonb,
  created_at timestamptz default now()
);
grant select, insert on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders owner read" on public.orders for select to authenticated using (auth.uid() = user_id);
create policy "orders owner insert" on public.orders for insert to authenticated with check (auth.uid() = user_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  size text,
  color text,
  name text,
  qty int not null,
  price_cents int not null
);
grant select, insert on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "order items via order" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid())
);
create policy "order items insert via order" on public.order_items for insert to authenticated with check (
  exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid())
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  created_at timestamptz default now()
);
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "public read reviews" on public.reviews for select to anon, authenticated using (true);
create policy "user writes own reviews" on public.reviews for insert to authenticated with check (auth.uid() = user_id);
create policy "user updates own reviews" on public.reviews for update to authenticated using (auth.uid() = user_id);
create policy "user deletes own reviews" on public.reviews for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.personalization_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anon_id text,
  persona text,
  payload jsonb,
  created_at timestamptz default now()
);
grant select, insert on public.personalization_snapshots to authenticated;
grant all on public.personalization_snapshots to service_role;
alter table public.personalization_snapshots enable row level security;
create policy "snapshots owner read" on public.personalization_snapshots
  for select to authenticated using (auth.uid() = user_id);
create policy "snapshots owner insert" on public.personalization_snapshots
  for insert to authenticated with check (auth.uid() = user_id);

create table if not exists public.featured_promotions (
  id uuid primary key default gen_random_uuid(),
  slot text not null,
  title text not null,
  subtitle text,
  image_url text,
  link text,
  active boolean default true,
  sort_order int default 0
);
grant select on public.featured_promotions to anon, authenticated;
grant all on public.featured_promotions to service_role;
alter table public.featured_promotions enable row level security;
create policy "public read promotions" on public.featured_promotions for select to anon, authenticated using (active);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now()
);
grant insert on public.newsletter_subscribers to anon, authenticated;
grant all on public.newsletter_subscribers to service_role;
alter table public.newsletter_subscribers enable row level security;
create policy "anyone can subscribe" on public.newsletter_subscribers for insert to anon, authenticated with check (true);

-- ===== Seed categories =====
insert into public.categories (slug, name, sort_order) values
  ('women', 'Women', 1),
  ('men', 'Men', 2),
  ('accessories', 'Accessories', 3),
  ('home', 'Home', 4)
on conflict (slug) do nothing;
