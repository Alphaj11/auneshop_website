"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMotionPref } from "@/components/ui/MotionPref";
import { BLOCKS, EDITORIAL, MEDIA, SCRUB, type StoryBlock } from "./story-config";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Position verticale d'un bloc dans le parcours : il passe au centre de l'écran quand la progression vaut `at`. */
const blockTop = (at: number) => `calc(${at * (SCRUB.trackScreens - 1) * 100}lvh + 50lvh)`;

function Block({ block }: { block: StoryBlock }) {
  return (
    <div className={`story-block story-block--${block.side}`} style={{ top: blockTop(block.at) }}>
      {block.eyebrow && <p className="story-eyebrow">{block.eyebrow}</p>}
      <h2 className={block.size === "xl" ? "story-title-xl" : "story-title"}>
        {block.title.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h2>
      {block.text && <p className="story-text">{block.text}</p>}
    </div>
  );
}

/** Image de la scène : poster du clip, ou photo de l'atelier si le clip n'est pas encore installé. */
function Poster({ className }: { className?: string }) {
  const [src, setSrc] = useState(MEDIA.poster);
  const img = useRef<HTMLImageElement>(null);
  // L'erreur peut survenir avant l'hydratation (onError non branché) : on vérifie au montage.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth === 0) requestAnimationFrame(() => setSrc(MEDIA.fallbackPoster));
  }, []);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={img} src={src} alt="" className={className} onError={() => setSrc(MEDIA.fallbackPoster)} />
  );
}

/**
 * « Chaque fil a son histoire » : une scène plein écran collée en haut de la page, dont la
 * vidéo avance et recule uniquement avec le scroll (jamais de lecture automatique ni de
 * boucle) ; les textes défilent normalement par-dessus, puis la section éditoriale prend le relais.
 */
export function AtelierStory() {
  const { reduced } = useMotionPref();
  const track = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const v = video.current;
    const t = track.current;
    if (reduced || !v || !t) return;

    // Une seule source téléchargée : 1080p sur grand écran, 720p sur mobile ou en mode économie de données.
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    const big = Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2) > 1400;
    v.src = !nav.connection?.saveData && big ? MEDIA.hd : MEDIA.sd;

    let duration = 0;
    let top = 0;
    let length = 1;
    let current = 0;
    let target = 0;
    let raf = 0;

    // Mesures de mise en page regroupées (pas de lecture de layout à chaque image).
    const measure = () => {
      const r = t.getBoundingClientRect();
      top = r.top + scrollY;
      length = Math.max(1, t.offsetHeight - innerHeight);
    };
    const frame = () => {
      raf = 0;
      target = clamp01((scrollY - top) / length) * Math.max(0, duration - 0.04);
      current += (target - current) * SCRUB.smoothing;
      if (Math.abs(target - current) < 0.002) current = target;
      // On ne demande une image que si la vidéo peut chercher, n'est pas déjà en train de le faire,
      // et que l'écart est perceptible ; « seeked » relance la boucle dès que possible.
      if (duration && v.readyState >= 1 && !v.seeking && Math.abs(v.currentTime - current) > SCRUB.minDelta) {
        v.currentTime = current;
      }
      if (current !== target) request();
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onMeta = () => {
      duration = v.duration || 0;
      measure();
      request();
    };
    const onResize = () => {
      measure();
      request();
    };
    const onError = () => setFailed(true);

    measure();
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("seeked", request);
    v.addEventListener("error", onError);
    addEventListener("scroll", request, { passive: true });
    addEventListener("resize", onResize, { passive: true });
    addEventListener("orientationchange", onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("seeked", request);
      v.removeEventListener("error", onError);
      removeEventListener("scroll", request);
      removeEventListener("resize", onResize);
      removeEventListener("orientationchange", onResize);
    };
  }, [reduced]);

  return (
    <>
      {reduced ? (
        // Animations réduites : une image fixe et les textes à la suite, sans scrub vidéo.
        <section className="story-static" aria-label="Notre histoire">
          <div className="story-static-media">
            <Poster className="h-full w-full object-cover" />
          </div>
          <div className="mx-auto max-w-3xl space-y-16 px-5 py-20 md:px-10">
            {BLOCKS.map((b) => (
              <div key={b.id}>
                {b.eyebrow && <p className="eyebrow">{b.eyebrow}</p>}
                <h2 className="display-lg mt-3">{b.title.join(" ")}</h2>
                {b.text && <p className="mt-4 text-lg text-ink-soft">{b.text}</p>}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section ref={track} className="story-track" style={{ height: `${SCRUB.trackScreens * 100}lvh` }} aria-label="Notre histoire">
          <div className="story-stage">
            <Poster className="story-media" />
            {!failed && <video ref={video} className="story-media" muted playsInline preload="auto" aria-hidden />}
            {/* Voile statique de lisibilité (pas animé) : assombrit à peine le centre pour les textes. */}
            <div className="story-veil" aria-hidden />
          </div>
          <div className="story-layer">
            {BLOCKS.map((b) => (
              <Block key={b.id} block={b} />
            ))}
          </div>
        </section>
      )}

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
