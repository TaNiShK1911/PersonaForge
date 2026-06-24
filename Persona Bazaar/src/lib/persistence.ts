/**
 * Supabase persistence for cart, wishlist, orders, and personalization snapshots.
 * All helpers no-op gracefully if Supabase isn't configured or the user is signed out.
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import {
  getCart,
  getWishlist,
  setCart,
  setWishlist,
  type CartItem,
} from "./store";

type Sb = SupabaseClient;

export type OrderRow = {
  id: string;
  status: string;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  shipping_address: Record<string, unknown> | null;
  created_at: string;
};
export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  name: string | null;
  qty: number;
  price_cents: number;
};

/* ---------- Cart sync ---------- */
export async function loadRemoteCart(sb: Sb, userId: string): Promise<CartItem[]> {
  const { data, error } = await sb
    .from("cart_items")
    .select("product_id,size,color,qty")
    .eq("user_id", userId);
  if (error) {
    console.warn("[persistence] loadRemoteCart", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    productId: r.product_id as string,
    size: (r.size as string) ?? "",
    color: (r.color as string) ?? "",
    qty: r.qty as number,
  }));
}

export async function pushCart(sb: Sb, userId: string, items: CartItem[]) {
  // Overwrite strategy: delete then insert. Demo-safe, atomic enough.
  const del = await sb.from("cart_items").delete().eq("user_id", userId);
  if (del.error) {
    console.warn("[persistence] pushCart delete", del.error.message);
    return;
  }
  if (!items.length) return;
  const rows = items.map((i) => ({
    user_id: userId,
    product_id: i.productId,
    size: i.size,
    color: i.color,
    qty: i.qty,
  }));
  const ins = await sb.from("cart_items").insert(rows);
  if (ins.error) console.warn("[persistence] pushCart insert", ins.error.message);
}

/* ---------- Wishlist sync ---------- */
export async function loadRemoteWishlist(sb: Sb, userId: string): Promise<string[]> {
  const { data, error } = await sb
    .from("wishlist_items")
    .select("product_id")
    .eq("user_id", userId);
  if (error) {
    console.warn("[persistence] loadRemoteWishlist", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.product_id as string);
}

export async function pushWishlist(sb: Sb, userId: string, ids: string[]) {
  const del = await sb.from("wishlist_items").delete().eq("user_id", userId);
  if (del.error) {
    console.warn("[persistence] pushWishlist delete", del.error.message);
    return;
  }
  if (!ids.length) return;
  const rows = ids.map((product_id) => ({ user_id: userId, product_id }));
  const ins = await sb.from("wishlist_items").insert(rows);
  if (ins.error) console.warn("[persistence] pushWishlist insert", ins.error.message);
}

/* ---------- Merge on sign-in ---------- */
export async function mergeOnSignIn(sb: Sb, user: User) {
  const localCart = getCart();
  const localWish = getWishlist();
  const [remoteCart, remoteWish] = await Promise.all([
    loadRemoteCart(sb, user.id),
    loadRemoteWishlist(sb, user.id),
  ]);

  // Cart merge: union by (productId,size,color), sum qty
  const map = new Map<string, CartItem>();
  for (const it of [...remoteCart, ...localCart]) {
    const k = `${it.productId}|${it.size}|${it.color}`;
    const existing = map.get(k);
    if (existing) existing.qty += it.qty;
    else map.set(k, { ...it });
  }
  const mergedCart = [...map.values()];

  // Wishlist merge: union
  const mergedWish = Array.from(new Set([...remoteWish, ...localWish]));

  setCart(mergedCart);
  setWishlist(mergedWish);
  await Promise.all([pushCart(sb, user.id, mergedCart), pushWishlist(sb, user.id, mergedWish)]);
}

/* ---------- Orders ---------- */
export type CreateOrderInput = {
  items: Array<{
    productId: string;
    name: string;
    size: string;
    color: string;
    qty: number;
    priceCents: number;
  }>;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  shippingAddress: Record<string, unknown>;
};

export async function createOrder(input: CreateOrderInput): Promise<{
  orderId: string | null;
  guest: boolean;
  error?: string;
}> {
  const sb = getSupabase();
  if (!sb) return { orderId: null, guest: true };
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) return { orderId: null, guest: true };

  const { data: order, error: orderErr } = await sb
    .from("orders")
    .insert({
      user_id: user.id,
      status: "paid",
      subtotal_cents: input.subtotalCents,
      shipping_cents: input.shippingCents,
      total_cents: input.totalCents,
      shipping_address: input.shippingAddress,
    })
    .select("id")
    .single();
  if (orderErr || !order) return { orderId: null, guest: false, error: orderErr?.message };

  const rows = input.items.map((i) => ({
    order_id: order.id,
    product_id: i.productId,
    size: i.size,
    color: i.color,
    name: i.name,
    qty: i.qty,
    price_cents: i.priceCents,
  }));
  const { error: itemsErr } = await sb.from("order_items").insert(rows);
  if (itemsErr) return { orderId: order.id, guest: false, error: itemsErr.message };

  // Best-effort: clear remote cart after purchase.
  await sb.from("cart_items").delete().eq("user_id", user.id);
  return { orderId: order.id, guest: false };
}

export async function loadMyOrders(): Promise<
  Array<OrderRow & { items: OrderItemRow[] }>
> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) return [];
  const { data: orders, error } = await sb
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !orders) return [];
  const ids = orders.map((o) => o.id);
  if (!ids.length) return [];
  const { data: items } = await sb
    .from("order_items")
    .select("*")
    .in("order_id", ids);
  const byOrder = new Map<string, OrderItemRow[]>();
  for (const it of items ?? []) {
    const arr = byOrder.get(it.order_id as string) ?? [];
    arr.push(it as OrderItemRow);
    byOrder.set(it.order_id as string, arr);
  }
  return (orders as OrderRow[]).map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] }));
}

/* ---------- Personalization snapshot ---------- */
export async function savePersonalizationSnapshot(payload: unknown, anonId: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  const persona =
    payload && typeof payload === "object" && "persona" in payload
      ? String((payload as { persona?: unknown }).persona ?? "")
      : null;
  await sb.from("personalization_snapshots").insert({
    user_id: user?.id ?? null,
    anon_id: anonId,
    persona,
    payload: payload as Record<string, unknown>,
  });
}
