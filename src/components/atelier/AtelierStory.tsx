import Link from "next/link";
import { ScrollStory } from "./ScrollStory";
import { BLOCKS, EDITORIAL, MEDIA, SCRUB } from "./story-config";

/**
 * Page « L'atelier » : la scène « Chaque fil a son histoire » pilotée par le scroll,
 * puis la section éditoriale qui prend le relais sur le fond papier.
 */
export function AtelierStory() {
  return (
    <>
      <ScrollStory media={MEDIA} scrub={SCRUB} blocks={BLOCKS} label="Notre histoire" />

      <section className="story-editorial" aria-labelledby="histoire-titre">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10">
          <h2 id="histoire-titre" className="display-xl">
            {EDITORIAL.title.map((line, i) => (
              <span key={line} className={`block ${i === EDITORIAL.title.length - 1 ? "italic text-ink-soft" : ""}`}>
                {line}
              </span>
            ))}
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-[1.4fr_1fr] md:gap-20">
            <p className="text-xl leading-relaxed md:text-2xl">{EDITORIAL.intro}</p>
            <ul className="space-y-3 self-end border-l border-line pl-6 text-sm text-ink-soft">
              {EDITORIAL.facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <div className="mt-20 grid gap-10 md:grid-cols-3 md:gap-12">
            {EDITORIAL.blocks.map((b, i) => (
              <div key={b.title} className="border-t border-line pt-6">
                <p className="eyebrow">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="display-md mt-3">{b.title}</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">{b.text}</p>
              </div>
            ))}
          </div>
          <Link href={EDITORIAL.cta.href} className="btn btn-primary mt-16">
            {EDITORIAL.cta.label}
          </Link>
        </div>
      </section>
    </>
  );
}
