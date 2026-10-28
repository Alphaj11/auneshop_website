import type { Metadata } from "next";
import { LaundryBasket } from "@/components/projet/LaundryBasket";
import { TiltPortrait } from "@/components/projet/TiltPortrait";
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
    <div className="mx-auto max-w-[1400px] px-5 pt-28 md:px-10 md:pt-32">
      <header className="text-center">
        <p className="eyebrow">{PROJET.eyebrow}</p>
        <h1 className="display-lg mx-auto mt-3 max-w-4xl">
          {PROJET.title.map((l, i) => (
            <span key={l} className={i === PROJET.title.length - 1 ? "italic text-ink-soft" : ""}>
              {l}{" "}
            </span>
          ))}
        </h1>
      </header>

      {/* Le portrait au centre ; le récit s'organise de part et d'autre. */}
      <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1fr_minmax(18rem,24rem)_1fr] lg:gap-12">
        <div className="space-y-8 lg:order-1">
          <Reveal>
            <p className="text-lg leading-relaxed">{PROJET.intro}</p>
          </Reveal>
          <Reveal delay={0.08} className="border-t border-line pt-6">
            <h2 className="font-display text-2xl">{PROJET.partner.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{PROJET.partner.text}</p>
            <a href={PROJET.partner.link.href} target="_blank" rel="noopener noreferrer" className="link-underline mt-3 inline-block text-sm">
              Découvrir {PROJET.partner.link.label} ↗
            </a>
          </Reveal>
        </div>

        <div className="order-first lg:order-2">
          <TiltPortrait
            src="/media/projet/mere-enfant.jpg"
            alt="Une mère en sari tient son enfant dans ses bras et sourit."
            credit="Photo d'illustration : Dharmjeet Kumar, Pexels"
          />
        </div>

        <div className="lg:order-3">
          <h2 className="font-display text-2xl">{PROJET.commitments.title}</h2>
          <ul className="mt-5 space-y-5">
            {PROJET.commitments.items.map((c, i) => (
              <Reveal key={c.title} delay={i * 0.06}>
                <li className="border-t border-line pt-4">
                  <h3 className="text-sm font-medium uppercase tracking-[0.12em]">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{c.text}</p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>

      <LaundryBasket cards={BASKET} />
    </div>
  );
}
