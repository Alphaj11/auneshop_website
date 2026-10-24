import type { Metadata } from "next";
import { CartContents } from "@/components/shop/CartContents";

export const metadata: Metadata = { title: "Panier", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-28 md:px-10 md:pt-36">
      <h1 className="display-lg mb-10">Panier</h1>
      <CartContents variant="page" />
    </div>
  );
}
