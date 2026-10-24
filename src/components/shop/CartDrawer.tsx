"use client";

import { useCallback } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { CartContents } from "./CartContents";
import { useCart } from "./CartProvider";

export function CartDrawer() {
  const { open, setOpen, cart } = useCart();
  const close = useCallback(() => setOpen(false), [setOpen]);
  return (
    <Sheet open={open} onClose={close} title={`Panier (${cart.count})`}>
      <CartContents variant="drawer" />
    </Sheet>
  );
}
