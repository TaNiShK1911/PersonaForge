/**
 * Cart + Wishlist store.
 *
 * Source of truth: in-memory state mirrored to localStorage for offline use.
 * When a Supabase auth user is present, mutations are pushed to Supabase
 * (cart_items, wishlist_items) by the <CartSync /> component in __root.tsx.
 */
import { useSyncExternalStore } from "react";

export type CartItem = {
  productId: string;
  size: string;
  color: string;
  qty: number;
};

const CART_KEY = "bazaar:cart";
const WISH_KEY = "bazaar:wishlist";

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: Listener) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

let cartCache: CartItem[] | null = null;
let wishCache: string[] | null = null;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, val: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
  if (key === CART_KEY) cartCache = val as CartItem[];
  if (key === WISH_KEY) wishCache = val as string[];
  notify();
}

/* ---------- Cart ---------- */
export function getCart(): CartItem[] {
  return read<CartItem[]>(CART_KEY, []);
}
export function setCart(items: CartItem[]) {
  write(CART_KEY, items);
}
export function addToCart(item: CartItem) {
  const cart = getCart();
  const i = cart.findIndex(
    (x) => x.productId === item.productId && x.size === item.size && x.color === item.color,
  );
  if (i >= 0) cart[i].qty += item.qty;
  else cart.push(item);
  write(CART_KEY, cart);
}
export function updateCartQty(idx: number, qty: number) {
  const cart = getCart();
  if (!cart[idx]) return;
  if (qty <= 0) cart.splice(idx, 1);
  else cart[idx].qty = qty;
  write(CART_KEY, cart);
}
export function removeFromCart(idx: number) {
  const cart = getCart();
  cart.splice(idx, 1);
  write(CART_KEY, cart);
}
export function clearCart() {
  write(CART_KEY, []);
}

/* ---------- Wishlist ---------- */
export function getWishlist(): string[] {
  return read<string[]>(WISH_KEY, []);
}
export function setWishlist(ids: string[]) {
  write(WISH_KEY, ids);
}
export function toggleWishlist(productId: string) {
  const list = getWishlist();
  const i = list.indexOf(productId);
  if (i >= 0) list.splice(i, 1);
  else list.push(productId);
  write(WISH_KEY, list);
  return list.includes(productId);
}
export function inWishlist(productId: string) {
  return getWishlist().includes(productId);
}

/* ---------- React bindings ---------- */
const EMPTY_CART: CartItem[] = [];
const EMPTY_WISH: string[] = [];

function getCartSnapshot(): CartItem[] {
  if (!cartCache) cartCache = getCart();
  return cartCache;
}
function getWishSnapshot(): string[] {
  if (!wishCache) wishCache = getWishlist();
  return wishCache;
}

export function useCart() {
  return useSyncExternalStore(subscribe, getCartSnapshot, () => EMPTY_CART);
}
export function useWishlist() {
  return useSyncExternalStore(subscribe, getWishSnapshot, () => EMPTY_WISH);
}

export function subscribeStore(l: Listener) {
  return subscribe(l);
}
