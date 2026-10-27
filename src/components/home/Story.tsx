"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const steps = [
  {
    key: "fibre",
    label: "01 — Le fil",
    title: "Tout commence par un fil.",
    text: "Le coton est préparé à la main, écheveau après écheveau. Avant la forme, il y a le choix de ce qu'on va travailler.",
    image: "/demo/atelier/fils.jpg",
  },
  {
    key: "tissage",
    label: "02 — Le tissage",
    title: "Le fil devient toile.",
    text: "Sur le métier, chaque fil de chaîne est tendu un à un. Trame après trame, la toile se construit : c'est ici que naissent la texture et la couleur.",
    image: "/demo/atelier/metier-a-tisser.jpg",
  },
  {
    key: "couture",
    label: "03 — La couture",
    title: "La toile passe sous l'aiguille.",
    text: "Sur les machines de l'atelier, chaque pièce est coupée puis assemblée, couture après couture.",
    image: "/demo/atelier/machine.jpg",
  },
  {
    key: "vetement",
    label: "04 — Le vêtement",
    title: "Fini à la main, prêt à vivre.",
    text: "Ourlets, liens, boutons : les derniers gestes se font à la main. Il ne manque que la personne qui le portera.",
    image: "/demo/atelier/couture.jpg",
  },
];

/** Récit défilant : l'image reste fixe et change au fil des étapes. */
export function Story({ title, subtitle, body }: { title: string; subtitle?: string; body?: string }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="bg-paper-2" aria-labelledby="story-title">
      <div className="mx-auto max-w-[1600px] px-5 pt-24 md:px-10 md:pt-32">
        {subtitle && <p className="eyebrow">{subtitle}</p>}
        <h2 id="story-title" className="display-lg mt-4 max-w-3xl">
          {title}
        </h2>
        {body && <p className="mt-4 max-w-xl text-sm text-ink-soft">{body}</p>}
      </div>
      <div className="mx-auto grid max-w-[1600px] gap-10 px-5 pb-24 md:grid-cols-2 md:px-10 md:pb-32">
        <div className="sticky top-24 hidden h-[calc(100svh-8rem)] items-center md:flex">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[3px] bg-paper-3">
            <AnimatePresence mode="popLayout">
              <motion.img
                key={steps[active].key}
                src={steps[active].image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ opacity: 0, scale: 1.06, clipPath: "inset(0 0 100% 0)" }}
                animate={{ opacity: 1, scale: 1, clipPath: "inset(0 0 0% 0)" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              />
            </AnimatePresence>
            <div className="absolute bottom-5 left-5 flex gap-1.5" aria-hidden>
              {steps.map((s, i) => (
                <span key={s.key} className={`h-1 rounded-full bg-paper transition-all duration-500 ${i === active ? "w-8" : "w-2 opacity-60"}`} />
              ))}
            </div>
          </div>
        </div>
        <ol className="md:py-[20vh]">
          {steps.map((s, i) => (
            <li key={s.key}>
              <div
                ref={(el) => {
                  refs.current[i] = el;
                }}
                data-index={i}
                className={`flex min-h-[50vh] flex-col justify-center py-10 transition-opacity duration-700 md:min-h-[70vh] ${
                  i === active ? "opacity-100" : "md:opacity-30"
                }`}
              >
                <div className="relative mb-6 aspect-[4/3] overflow-hidden rounded-[3px] md:hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                </div>
                <p className="eyebrow">{s.label}</p>
                <h3 className="display-md mt-4 max-w-md">{s.title}</h3>
                <p className="mt-4 max-w-md leading-relaxed text-ink-soft">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
