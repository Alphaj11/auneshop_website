"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useMotionPref } from "@/components/ui/MotionPref";

export type StudioCard = { label: string; value: string; sub: string; gold?: boolean; icon: "thread" | "calendar" | "grid" };

const POSTER = "/demo/hero-main/poster.jpg";
const VIDEO = "/demo/hero-main/main.mp4";
/** L'image fixe est prise à 2 s : la vidéo démarre au même instant pour un fondu sans saut. */
const POSTER_TIME = 2;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const icons = {
  thread: (
    <path d="M3 13c3-6 7 2 10-4M4 4l8 8M9 3l4 4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  ),
  calendar: (
    <>
      <rect x="2.5" y="3.5" width="11" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 7h11M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  grid: (
    <path d="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  ),
};

/** Attend la fin de l'intro brodée si elle est affichée (sinon immédiat). */
function introFinished() {
  const el = document.querySelector<HTMLElement>('[data-testid="intro"]');
  if (!el || getComputedStyle(el).display === "none") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => resolve();
    window.addEventListener("aune:intro-done", done, { once: true });
    setTimeout(done, 9000);
  });
}

/**
 * Accueil « Sage Studio » : une main s'élève du bas de l'écran sur un mur sauge,
 * une bague gravée « au·ne » entre ses doigts, le logo projeté en ombre sur le mur.
 * Textes à gauche, trois cartes de verre à droite, entrée orchestrée en une seule
 * timeline (Web Animations) qui s'annule à la fin pour rendre la main aux styles écrits.
 */
export function HeroStudio({ cards }: { cards: StudioCard[] }) {
  const root = useRef<HTMLElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const { reduced } = useMotionPref();

  // Entrée : une timeline, remplissage « backwards », annulée une fois jouée.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const release = () => {
      el.removeAttribute("data-await");
      delete document.documentElement.dataset.heroAwait;
    };
    if (reduced) return release();
    let cancelled = false;
    const anims: Animation[] = [];
    const poster = el.querySelector<HTMLImageElement>("img[data-poster]");
    const ready = Promise.all([
      document.fonts.ready,
      poster?.decode().catch(() => undefined),
      introFinished(),
    ]);
    const failsafe = setTimeout(release, 9500);
    ready.then(() => {
      if (cancelled) return;
      const add = (node: Element | null, frames: Keyframe[], delay: number, duration = 900) => {
        if (node) anims.push(node.animate(frames, { delay, duration, easing: EASE, fill: "backwards" }));
      };
      document.querySelectorAll("[data-hero-head]").forEach((n, i) =>
        add(n, [{ opacity: 0, transform: "translateY(-18px)" }, { opacity: 1, transform: "none" }], 60 + i * 55, 700),
      );
      add(el.querySelector("[data-anim=dot]"), [{ clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)" }], 420, 500);
      add(el.querySelector("[data-anim=eyebrow]"), [{ opacity: 0, transform: "translateX(-8px)" }, { opacity: 1, transform: "none" }], 560, 700);
      el.querySelectorAll("[data-anim=line]").forEach((n, i) =>
        add(n, [{ transform: "translateY(105%)" }, { transform: "none" }], 640 + i * 130, 1000),
      );
      add(el.querySelector("[data-anim=para]"), [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], 980, 800);
      add(el.querySelector("[data-anim=cta]"), [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], 1100, 800);
      el.querySelectorAll("[data-anim=card]").forEach((n, i) =>
        add(n, [{ opacity: 0, transform: "translateY(36px)" }, { opacity: 1, transform: "none" }], 900 + i * 130, 950),
      );
      release();
      Promise.all(anims.map((a) => a.finished))
        .then(() => anims.forEach((a) => a.cancel()))
        .catch(() => undefined);
    });
    return () => {
      cancelled = true;
      clearTimeout(failsafe);
      anims.forEach((a) => a.cancel());
    };
  }, [reduced]);

  // Vidéo d'ambiance : deux lecteurs en relais, la dernière seconde fond dans la première.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (reduced || params.get("hero") === "fixe") return;
    const [a, b] = videos.current;
    if (!a || !b) return;
    let active = a;
    let idle = b;
    let fading = false;
    let swap = 0;
    let stopped = false;
    // Fondu, puis valeur finale inscrite dans le style et animation libérée (pas d'empilement).
    const fade = (v: HTMLVideoElement, from: number, to: number, duration: number) => {
      const anim = v.animate([{ opacity: from }, { opacity: to }], { duration, easing: "linear", fill: "forwards" });
      anim.finished
        .then(() => {
          v.style.opacity = String(to);
          anim.cancel();
        })
        .catch(() => undefined);
    };

    // Relais : à une seconde de la fin, l'autre lecteur repart du début et fond par-dessus.
    const crossfade = () => {
      if (fading || stopped) return;
      fading = true;
      idle.currentTime = 0;
      idle.play().catch(() => undefined);
      fade(idle, 0, 1, 1000);
      fade(active, 1, 0, 1000);
      swap = window.setTimeout(() => {
        active.pause();
        [active, idle] = [idle, active];
        fading = false;
      }, 1000);
    };
    const onTime = (e: Event) => {
      const v = e.currentTarget as HTMLVideoElement;
      if (v === active && v.duration && v.currentTime >= v.duration - 1) crossfade();
    };
    // Filet de sécurité : si la fin arrive sans fondu (onglet en arrière-plan), on enchaîne net.
    const onEnded = (e: Event) => {
      if (e.currentTarget === active && !fading) crossfade();
    };

    // Le premier lecteur démarre seul (autoplay, à 2 s via #t=2) ; on le révèle dès qu'il joue.
    let started = false;
    const start = () => {
      if (started || stopped) return;
      started = true;
      fade(a, 0, 1, 800);
    };
    // Lecture refusée (économie d'énergie) : l'image fixe reste, on retente plus tard.
    const retry = () => {
      if (!started && a.paused) a.play().catch(() => undefined);
    };
    for (const v of [a, b]) {
      v.addEventListener("timeupdate", onTime);
      v.addEventListener("ended", onEnded);
    }
    document.addEventListener("visibilitychange", retry);
    window.addEventListener("pointerdown", retry, { once: true });
    if (!a.paused && a.currentTime > 0) start();
    else a.addEventListener("playing", start, { once: true });
    retry();
    return () => {
      stopped = true;
      clearTimeout(swap);
      for (const v of [a, b]) {
        v.removeEventListener("timeupdate", onTime);
        v.removeEventListener("ended", onEnded);
        v.pause();
      }
      a.removeEventListener("playing", start);
      document.removeEventListener("visibilitychange", retry);
      window.removeEventListener("pointerdown", retry);
    };
  }, [reduced]);

  return (
    <section ref={root} className="studio" data-await="" aria-label="Aune, l'atelier">
      {/* Avant la première image : masque les éléments animés (sauf si l'animation est réduite). */}
      <script
        dangerouslySetInnerHTML={{
          __html: `if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&document.documentElement.dataset.motion!=="off")document.documentElement.dataset.heroAwait="1";else document.currentScript.parentElement.removeAttribute("data-await")`,
        }}
      />
      <div className="studio-stage" aria-hidden>
        <div className="studio-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img data-poster src={POSTER} alt="" fetchPriority="high" />
          {!reduced &&
            [0, 1].map((i) => (
              <video
                key={i}
                ref={(v) => {
                  videos.current[i] = v;
                }}
                src={i === 0 ? `${VIDEO}#t=${POSTER_TIME}` : VIDEO}
                muted
                playsInline
                autoPlay={i === 0}
                preload={i === 0 ? "auto" : "metadata"}
                style={{ opacity: 0 }}
              />
            ))}
          {/* Le logo projeté en ombre sur le mur, dans le sens des ombres de feuilles. */}
          <span className="studio-logo-shadow" />
        </div>
      </div>

      <div className="studio-copy">
        <p className="studio-eyebrow">
          <span data-anim="dot" className="studio-dot" />
          <span data-anim="eyebrow">Atelier · Tissé à la main</span>
        </p>
        <h1 className="studio-title">
          <span className="studio-line">
            <span data-anim="line">Tissé à la main.</span>
          </span>
          <span className="studio-line">
            <span data-anim="line">Porté avec soin.</span>
          </span>
        </h1>
        <p data-anim="para" className="studio-para">
          Des pièces en coton tissé artisanalement, coupées et cousues à la commande : pensées pour durer, faites pour
          bouger avec vous.
        </p>
        <div data-anim="cta">
          <Link href="/collections" className="studio-cta">
            Découvrir les collections
          </Link>
        </div>
      </div>

      <ul className="studio-cards" aria-label="L'atelier en bref">
        {cards.map((c) => (
          <li key={c.label} data-anim="card" className="studio-card glass">
            <p className="studio-card-label">
              <svg viewBox="0 0 16 16" aria-hidden>
                {icons[c.icon]}
              </svg>
              {c.label}
            </p>
            <p className="studio-card-value font-numeral">{c.value}</p>
            <p className={`studio-card-sub ${c.gold ? "text-gold" : ""}`}>{c.sub}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
