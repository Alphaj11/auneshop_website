import type { Metadata } from "next";
import ShopPage from "../boutique/page";

export const metadata: Metadata = { title: "Femme", alternates: { canonical: "/femme" } };

// Rayon Femme : la boutique filtrée, avec son expérience immersive.
export default function FemmePage() {
  return ShopPage({ searchParams: Promise.resolve({ rayon: "femme" }) });
}
