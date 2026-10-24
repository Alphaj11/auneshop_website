import type { Metadata } from "next";
import Link from "next/link";
import { Story } from "@/components/home/Story";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "L'atelier",
  description: "Avant d'être une marque, nous sommes un atelier : l'histoire d'Aune.",
  alternates: { canonical: "/atelier" },
};

export default function AtelierPage() {
  return (
    <>
      <section className="mx-auto max-w-[1600px] px-5 pb-16 pt-32 md:px-10 md:pt-44">
        <p className="eyebrow">À propos</p>
        <h1 className="display-xl mt-4 max-w-5xl">Avant d&apos;être une marque, nous sommes un atelier.</h1>
        <div className="mt-16 grid gap-10 md:grid-cols-2">
          <Reveal>
            <p className="text-xl leading-relaxed">
              Texte d&apos;exemple — à remplacer par l&apos;histoire réelle de la marque depuis l&apos;administration ou ce fichier.
              Aune réalise des pièces en petites séries, fabriquées à la commande pour éviter la surproduction.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="leading-relaxed text-ink-soft">
              Les informations sur les matières, les lieux de fabrication et les partenaires ne doivent être publiées
              qu&apos;une fois vérifiées. Cette page est un gabarit éditorial : elle raconte le passage de la matière au
              vêtement, et peut accueillir photos d&apos;atelier, portraits et vidéos.
            </p>
            <Link href="/collections" className="btn btn-primary mt-8">Voir les collections</Link>
          </Reveal>
        </div>
      </section>
      <Story title="De la matière au mouvement" subtitle="Le processus" />
    </>
  );
}
