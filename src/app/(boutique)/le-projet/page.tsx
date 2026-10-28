import type { Metadata } from "next";
import { LaundryBasket } from "@/components/projet/LaundryBasket";
import { MotherIllustration } from "@/components/projet/MotherIllustration";
import { BASKET, PROJET } from "@/components/projet/projet-content";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Le projet",
  description:
    "Aune : des vêtements tissés à la main en Inde, un projet solidaire né avec l'ONG Tender Heart pour revaloriser l'artisanat textile et soutenir l'émancipation des femmes.",
  alternates: { canonical: "/le-projet" },
};

export default function LeProjetPage() {
  return (
    <div className="relative overflow-hidden">
      {/* L'illustration habite le fond de la page ; ses regards suivent le curseur. */}
      <div aria-hidden={false} className="pointer-events-none absolute right-[-6rem] top-24 w-[min(70vw,40rem)] opacity-90 max-md:right-[-4rem] max-md:top-20 max-md:w-[22rem] max-md:opacity-35 lg:right-0">
        <MotherIllustration className="h-auto w-full" />
      </div>

      <section className="relative mx-auto max-w-[1400px] px-5 pb-20 pt-32 md:px-10 md:pt-44">
        <p className="eyebrow">{PROJET.eyebrow}</p>
        <h1 className="display-xl mt-4 max-w-4xl">
          {PROJET.title.map((l, i) => (
            <span key={l} className={`block ${i === PROJET.title.length - 1 ? "italic text-ink-soft" : ""}`}>
              {l}
            </span>
          ))}
        </h1>
        <Reveal>
          <p className="mt-10 max-w-xl text-xl leading-relaxed">{PROJET.intro}</p>
        </Reveal>
      </section>

      <section className="relative mx-auto max-w-[1400px] px-5 py-16 md:px-10">
        <Reveal className="max-w-xl rounded-[3px] bg-paper/80 p-6 backdrop-blur-sm md:p-8">
          <h2 className="display-md">{PROJET.partner.title}</h2>
          <p className="mt-4 leading-relaxed text-ink-soft">{PROJET.partner.text}</p>
          <a href={PROJET.partner.link.href} target="_blank" rel="noopener noreferrer" className="link-underline mt-4 inline-block text-sm">
            Découvrir {PROJET.partner.link.label} ↗
          </a>
        </Reveal>
      </section>

      <section className="relative mx-auto max-w-[1400px] px-5 py-16 md:px-10">
        <h2 className="display-md max-w-2xl">{PROJET.commitments.title}</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {PROJET.commitments.items.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.06} className="border-t border-line bg-paper/70 pt-5 backdrop-blur-sm">
              <h3 className="font-display text-2xl">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{c.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <LaundryBasket cards={BASKET} />
    </div>
  );
}
