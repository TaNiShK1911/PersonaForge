/**
 * Wires the local cart/wishlist store to Supabase for authenticated users.
 * On sign-in: merges local with remote. On every local mutation: pushes the
 * full new state to Supabase (debounced). Renders nothing.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/use-auth";
import { subscribeStore, getCart, getWishlist } from "@/lib/store";
import { mergeOnSignIn, pushCart, pushWishlist } from "@/lib/persistence";

export function CartSync() {
  const { user, supabase } = useAuth();
  const ready = useRef(false);
  const lastUser = useRef<string | null>(null);

  // On user change: merge local <-> remote.
  useEffect(() => {
    if (!supabase) return;
    if (!user) {
      ready.current = false;
      lastUser.current = null;
      return;
    }
    if (lastUser.current === user.id) return;
    lastUser.current = user.id;
    ready.current = false;
    mergeOnSignIn(supabase, user)
      .catch((e) => console.warn("[CartSync] merge", e))
      .finally(() => {
        ready.current = true;
      });
  }, [user, supabase]);

  // On every store change while signed in: push to Supabase (debounced).
  useEffect(() => {
    if (!supabase || !user) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      if (!ready.current) return;
      pushCart(supabase, user.id, getCart()).catch(() => {});
      pushWishlist(supabase, user.id, getWishlist()).catch(() => {});
    };
    const unsub = subscribeStore(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 400);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [user, supabase]);

  return null;
}
