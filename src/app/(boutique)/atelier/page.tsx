import type { Metadata } from "next";
import { AtelierStory } from "@/components/atelier/AtelierStory";

export const metadata: Metadata = {
  title: "L'atelier",
  description: "Chaque fil a son histoire : de la matière brute au vêtement, l'histoire d'Aune racontée au fil du geste.",
  alternates: { canonical: "/atelier" },
};

export default function AtelierPage() {
  return <AtelierStory />;
}
