"use client";

import { createContext, useCallback, useContext, useState, useTransition } from "react";
import type { CartView } from "@/lib/cart";
import {
  addToCart as addAction,
  applyDiscountCode,
  changeCartVariant,
  removeCartItem,
  updateCartItem,
  type CartResult,
} from "@/app/actions/cart";
import { useToast } from "@/components/ui/Toaster";

type CartCtx = {
  cart: CartView;
  open: boolean;
  setOpen: (open: boolean) => void;
  pending: boolean;
  /** Dernier ajout, pour l'animation du bouton panier. */
  lastAddedAt: number;
  add: (variantId: string, quantity?: number, opts?: { openDrawer?: boolean }) => Promise<boolean>;
  update: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  changeVariant: (itemId: string, variantId: string) => Promise<void>;
  applyCode: (code: string) => Promise<boolean>;
};

const Ctx = createContext<CartCtx | null>(null);

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart hors CartProvider");
  return ctx;
}

export function CartProvider({ initial, children }: { initial: CartView; children: React.ReactNode }) {
  const [cart, setCart] = useState(initial);
  const [open, setOpen] = useState(false);
  const [lastAddedAt, setLastAddedAt] = useState(0);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const run = useCallback(
    (fn: () => Promise<CartResult>, successToast = false) =>
      new Promise<boolean>((resolve) => {
        startTransition(async () => {
          try {
            const res = await fn();
            if (res.cart) setCart(res.cart);
            if (!res.ok) toast(res.error, "error");
            else if (successToast && res.message) toast(res.message);
            resolve(res.ok);
          } catch {
            toast("Une erreur est survenue. Réessayez.", "error");
            resolve(false);
          }
        });
      }),
    [toast],
  );

  const value: CartCtx = {
    cart,
    open,
    setOpen,
    pending,
    lastAddedAt,
    add: async (variantId, quantity = 1, opts = {}) => {
      const ok = await run(() => addAction(variantId, quantity), true);
      if (ok) {
        setLastAddedAt(Date.now());
        if (opts.openDrawer !== false) setOpen(true);
      }
      return ok;
    },
    update: async (id, q) => void (await run(() => updateCartItem(id, q))),
    remove: async (id) => void (await run(() => removeCartItem(id))),
    changeVariant: async (id, v) => void (await run(() => changeCartVariant(id, v))),
    applyCode: (code) => run(() => applyDiscountCode(code), true),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
