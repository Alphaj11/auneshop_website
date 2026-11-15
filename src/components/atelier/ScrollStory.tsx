"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionPref } from "@/components/ui/MotionPref";
import type { StoryBlock, StoryMedia, StoryScrub } from "./story-config";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function Block({ block, screens }: { block: StoryBlock; screens: number }) {
  // Le bloc passe au centre de l'écran quand la progression vaut `at`.
  const top = (at: number) => `calc(${at * (screens - 1) * 100}lvh + 50lvh)`;
  return (
    <div
      className={`story-block story-block--${block.side}`}
      style={{ "--top": top(block.at), "--top-m": top(block.atMobile ?? block.at) } as React.CSSProperties}
    >
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

/** Image de la scène : poster du clip, ou image de repli si le clip n'est pas installé. */
function Poster({ media, className }: { media: StoryMedia; className?: string }) {
  const [src, setSrc] = useState(media.poster);
  const img = useRef<HTMLImageElement>(null);
  // L'erreur peut survenir avant l'hydratation (onError non branché) : on vérifie au montage.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth === 0) requestAnimationFrame(() => setSrc(media.fallbackPoster));
  }, [media.fallbackPoster]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={img} src={src} alt="" className={className} onError={() => setSrc(media.fallbackPoster)} />
  );
}

/**
 * Scène plein écran collée en haut de son parcours : la vidéo avance et recule uniquement
 * avec le scroll (jamais de lecture automatique ni de boucle), les textes défilent
 * normalement par-dessus. Animations réduites : image fixe et textes à la suite.
 */
export function ScrollStory({
  media,
  scrub,
  blocks,
  label,
}: {
  media: StoryMedia;
  scrub: StoryScrub;
  blocks: StoryBlock[];
  label: string;
}) {
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
    v.src = !nav.connection?.saveData && big ? media.hd : media.sd;

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
      current += (target - current) * scrub.smoothing;
      if (Math.abs(target - current) < 0.002) current = target;
      // On ne demande une image que si la vidéo peut chercher, n'est pas déjà en train de le faire,
      // et que l'écart est perceptible ; « seeked » relance la boucle dès que possible.
      if (duration && v.readyState >= 1 && !v.seeking && Math.abs(v.currentTime - current) > scrub.minDelta) {
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
  }, [reduced, media.hd, media.sd, scrub.smoothing, scrub.minDelta]);

  if (reduced)
    return (
      <section className="story-static" aria-label={label}>
        <div className="story-static-media">
          <Poster media={media} className="h-full w-full object-cover" />
        </div>
        <div className="mx-auto max-w-3xl space-y-16 px-5 py-20 md:px-10">
          {blocks.map((b) => (
            <div key={b.id}>
              {b.eyebrow && <p className="eyebrow">{b.eyebrow}</p>}
              <h2 className="display-lg mt-3">{b.title.join(" ")}</h2>
              {b.text && <p className="mt-4 text-lg text-ink-soft">{b.text}</p>}
            </div>
          ))}
        </div>
      </section>
    );

  return (
    <section ref={track} className="story-track" style={{ height: `${scrub.trackScreens * 100}lvh` }} aria-label={label}>
      <div className="story-stage">
        <Poster media={media} className="story-media" />
        {!failed && <video ref={video} className="story-media" muted playsInline preload="auto" aria-hidden />}
        {/* Voile statique de lisibilité (pas animé) : assombrit à peine le centre pour les textes. */}
        <div className="story-veil" aria-hidden />
      </div>
      <div className="story-layer">
        {blocks.map((b) => (
          <Block key={b.id} block={b} screens={scrub.trackScreens} />
        ))}
      </div>
    </section>
  );
}
