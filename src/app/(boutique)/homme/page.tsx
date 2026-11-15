import type { Metadata } from "next";
import ShopPage from "../boutique/page";

export const metadata: Metadata = { title: "Homme", alternates: { canonical: "/homme" } };

// Rayon Homme : la boutique filtrée, avec son expérience immersive.
export default function HommePage() {
  return ShopPage({ searchParams: Promise.resolve({ rayon: "homme" }) });
}
