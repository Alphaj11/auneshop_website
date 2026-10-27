"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { useMotionPref } from "@/components/ui/MotionPref";
import { drawNeedle, hex, mix, rgba, type RGB } from "./intro-materials";

/**
 * « Le vêtement prend vie » — introduction animée (Canvas 2D), ~4,2 s.
 *
 * Une aiguille brode le logo « au·ne » d'un seul fil, lettre après lettre, sur fond
 * beige ; le point du milieu est un point noué. Le fil se tend, l'aiguille s'en va,
 * puis la page d'accueil se révèle. Les tracés suivent la ligne centrale du logo
 * (extraite de public/brand/logo-bordeaux.png, 605 × 173 px, trait ≈ 22 px).
 *
 * Passable à tout moment (bouton, touche Échap). Jamais rejouée tant que la version
 * de l'intro ne change pas. Désactivée si l'utilisateur préfère réduire les animations.
 */

type Props = {
  storeName: string;
  line1: string;
  line2: string;
  version: number;
  mobileMode: "full" | "light" | "off";
  /** Conservé pour compatibilité avec les réglages : l'intro brode désormais le logo. */
  garmentImageUrl?: string;
};

type P = [number, number];

/** Lignes centrales du logo, dans l'ordre d'écriture (repère 605 × 173). */
const STROKES: P[][] = [
  // ə
  [
    [12, 48], [20, 38], [35, 24], [60, 16], [80, 20], [97, 35], [105, 60], [105, 85], [102, 110], [94, 131],
    [75, 145], [50, 150], [27, 147], [18, 131], [20, 110], [35, 96], [56, 87], [80, 85], [103, 87],
  ],
  // u : jambage gauche, remontée, puis redescente et délié final
  [
    [162, 16], [155, 42], [149, 80], [147, 110], [152, 130], [165, 145], [181, 150], [199, 147], [213, 138], [222, 130],
    [229, 100], [235, 68], [239, 44], [242, 27], [239, 44], [235, 68], [229, 100], [223, 128], [230, 143], [242, 152],
    [258, 153], [272, 145], [283, 132], [290, 118],
  ],
  // n : attaque, jambage, retour, arche
  [
    [312, 55], [325, 37], [341, 24], [358, 20], [369, 28], [377, 42], [373, 72], [368, 102], [362, 130], [358, 148],
    [362, 130], [368, 102], [373, 72], [377, 42], [392, 37], [412, 27], [434, 26], [449, 37], [455, 60], [456, 92],
    [452, 120], [446, 142], [440, 155],
  ],
  // e
  [
    [499, 83], [522, 85], [545, 84], [565, 78], [580, 65], [586, 45], [580, 29], [562, 21], [542, 21], [524, 31],
    [509, 50], [501, 74], [498, 103], [504, 127], [520, 146], [544, 154], [565, 151], [579, 139], [590, 120],
  ],
];
/** Point noué au centre du logo : spirale serrée. */
const DOT: P[] = Array.from({ length: 34 }, (_, i) => {
  const t = i / 33;
  const a = t * Math.PI * 4.2;
  const r = 2 + t * 7.5;
  return [299 + Math.cos(a) * r, 87 + Math.sin(a) * r] as P;
});

const BEIGE = "#E6DAC7";
const THREAD: RGB = hex("#3E0812");
const W_LOGO = 605;
const H_LOGO = 173;
const STROKE = 21;

/** Catmull-Rom ré-échantillonnée à pas constant (≈ 1 unité). */
function sample(points: P[]): P[] {
  const dense: P[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let k = 0; k < 16; k++) {
      const t = k / 16;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push(points[points.length - 1]);
  const out: P[] = [dense[0]];
  let acc = 0;
  for (let i = 1; i < dense.length; i++) {
    acc += Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]);
    if (acc >= 1) {
      out.push(dense[i]);
      acc = 0;
    }
  }
  out.push(dense[dense.length - 1]);
  return out;
}

/** Vrai dès que l'intro a été jouée ou passée pendant cette visite. */
export const introState = { done: false };

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const easeInOut = (t: number) => {
  t = clamp01(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/** Clé de session : l'intro est rejouée à chaque nouvelle ouverture du site (nouvel onglet). */
const SEEN_KEY = "aune_intro_vu";

function markSeen(version: number) {
  try {
    sessionStorage.setItem(SEEN_KEY, String(version));
  } catch {
    // Stockage indisponible (navigation privée stricte) : l'intro se rejouera, sans gravité.
  }
}

/** Script inline exécuté avant l'affichage : masque l'intro déjà vue dans cet onglet. */
export const introSeenScript = (version: number) =>
  `try{if(sessionStorage.getItem("${SEEN_KEY}")==="${version}"&&!/[?&]intro(-t)?=/.test(location.search))document.documentElement.dataset.introVue="1"}catch(e){}`;

export function Intro({ storeName, line1, line2, version, mobileMode }: Props) {
  // Le bouton « animations » du site coupe l'intro ; la préférence système « réduire les
  // animations » donne une version fixe : le logo brodé apparaît en fondu, sans mouvement.
  const { userOff } = useMotionPref();
  const systemReduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState(0); // 0 broderie, 1 signature, 2 sortie
  const canvas = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const ended = useRef(false);

  const finish = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    introState.done = true;
    cancelAnimationFrame(raf.current);
    markSeen(version);
    setPhase(2);
    setTimeout(() => setVisible(false), 900);
  }, [version]);

  const compact = useMediaQuery("(max-width: 767px), (pointer: coarse)");
  const skip = userOff || (compact && mobileMode === "off");

  useEffect(() => {
    if (skip) {
      ended.current = true;
      introState.done = true;
      markSeen(version);
      return;
    }
    if (document.documentElement.dataset.introVue === "1") {
      // Déjà vue dans cet onglet : on retire simplement le calque (masqué en CSS dès le départ).
      ended.current = true;
      introState.done = true;
      const id = requestAnimationFrame(() => setVisible(false));
      return () => cancelAnimationFrame(id);
    }
    const nav = navigator as Navigator & { deviceMemory?: number };
    const isMobile = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    const lowPower = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    const light = (isMobile && mobileMode === "light") || lowPower;

    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx || typeof ctx.roundRect !== "function") return finish();

    const dpr = light ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    el.width = W * dpr;
    el.height = H * dpr;
    el.style.width = `${W}px`;
    el.style.height = `${H}px`;

    // Logo centré, un peu au-dessus du milieu.
    const s = Math.min((W * (W < 640 ? 0.84 : 0.7)) / W_LOGO, (H * 0.26) / H_LOGO, 1.25);
    const ox = W / 2 - (W_LOGO * s) / 2;
    const oy = H * 0.44 - (H_LOGO * s) / 2;
    const toScreen = ([x, y]: P): P => [ox + x * s, oy + y * s];

    // Parcours de l'aiguille : tracés + sauts aériens entre deux lettres.
    type Seg = { pts: P[]; jump: boolean; len: number; start: number };
    const order = [STROKES[0], STROKES[1], DOT, STROKES[2], STROKES[3]].map(sample);
    const segs: Seg[] = [];
    let total = 0;
    order.forEach((pts, i) => {
      if (i > 0) {
        const a = order[i - 1][order[i - 1].length - 1];
        const b = pts[0];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.45;
        segs.push({ pts: [a, b], jump: true, len, start: total });
        total += len;
      }
      segs.push({ pts, jump: false, len: pts.length - 1, start: total });
      total += pts.length - 1;
    });
    const at = (d: number) => {
      const seg = segs.find((g) => d <= g.start + g.len) ?? segs[segs.length - 1];
      const local = Math.max(0, d - seg.start);
      if (seg.jump) {
        const t = seg.len ? local / seg.len : 1;
        const [a, b] = seg.pts;
        return { seg, p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as P, lift: Math.sin(Math.PI * t), i: 0 };
      }
      const i = Math.min(seg.pts.length - 1, Math.floor(local));
      return { seg, p: seg.pts[i], lift: 0, i };
    };

    const STROKE_PX = STROKE * s;
    const dark = mix(THREAD, [10, 2, 4], 0.45);
    const lightThread = mix(THREAD, [255, 230, 220], 0.32);

    /** Fil épais retors : ombre, âme, reflet, torsion des brins. */
    const drawCord = (pts: P[], alpha = 1) => {
      if (pts.length < 2) return;
      const line = () => {
        ctx.beginPath();
        const [x0, y0] = toScreen(pts[0]);
        ctx.moveTo(x0, y0);
        for (let i = 1; i < pts.length; i++) {
          const [x, y] = toScreen(pts[i]);
          ctx.lineTo(x, y);
        }
      };
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // Ombre portée douce sur le tissu beige.
      ctx.save();
      ctx.translate(STROKE_PX * 0.12, STROKE_PX * 0.2);
      line();
      ctx.strokeStyle = `rgba(70,40,20,${0.16 * alpha})`;
      ctx.lineWidth = STROKE_PX * 1.12;
      ctx.stroke();
      ctx.restore();
      line();
      ctx.strokeStyle = rgba(THREAD, alpha);
      ctx.lineWidth = STROKE_PX;
      ctx.stroke();
      // Reflet le long du fil (lumière venant d'en haut à gauche).
      ctx.save();
      ctx.translate(-STROKE_PX * 0.14, -STROKE_PX * 0.16);
      line();
      ctx.strokeStyle = rgba(lightThread, 0.35 * alpha);
      ctx.lineWidth = STROKE_PX * 0.32;
      ctx.stroke();
      ctx.restore();
      // Torsion : brins obliques réguliers.
      ctx.strokeStyle = rgba(dark, 0.55 * alpha);
      ctx.lineWidth = Math.max(0.8, STROKE_PX * 0.09);
      const step = Math.max(3, Math.round(STROKE * 0.42));
      ctx.beginPath();
      for (let i = step; i < pts.length - 1; i += step) {
        const [x, y] = toScreen(pts[i]);
        const [xa, ya] = toScreen(pts[i - 1]);
        const [xb, yb] = toScreen(pts[i + 1]);
        let tx = xb - xa;
        let ty = yb - ya;
        const n = Math.hypot(tx, ty) || 1;
        tx /= n;
        ty /= n;
        const h = STROKE_PX * 0.44;
        ctx.moveTo(x - ty * h - tx * h * 0.6, y + tx * h - ty * h * 0.6);
        ctx.lineTo(x + ty * h + tx * h * 0.6, y - tx * h + ty * h * 0.6);
      }
      ctx.stroke();
    };

    const DURATION = light ? 3600 : 4200;
    const T = (f: number) => f * DURATION;
    // Réglage en développement : ?intro-t=0.4 fige l'animation à 40 %.
    const freeze =
      process.env.NODE_ENV !== "production" ? Number(new URLSearchParams(location.search).get("intro-t") ?? NaN) : NaN;
    const start = performance.now();
    let lastPhase = -1;

    const frame = (now: number) => {
      const t = Number.isFinite(freeze) ? freeze * DURATION : now - start;
      const ph = t < T(0.8) ? 0 : 1;
      if (ph !== lastPhase) {
        lastPhase = ph;
        setPhase(ph);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = BEIGE;
      ctx.fillRect(0, 0, W, H);
      const vig = ctx.createRadialGradient(W / 2, H * 0.44, Math.min(W, H) * 0.15, W / 2, H / 2, Math.max(W, H) * 0.75);
      vig.addColorStop(0, "rgba(255,251,244,.55)");
      vig.addColorStop(1, "rgba(160,130,95,.16)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      // Broderie : 8 % → 70 % de la durée, vitesse douce au début et à la fin.
      const prog = easeInOut((t - T(0.08)) / T(0.62)) * total;
      const settle = ease((t - T(0.7)) / T(0.12));
      const pulse = 1 + Math.sin(settle * Math.PI) * 0.018;

      ctx.save();
      ctx.translate(W / 2, H * 0.44);
      ctx.scale(pulse, pulse);
      ctx.translate(-W / 2, -H * 0.44);
      for (const g of segs) {
        if (g.jump || g.start > prog) continue;
        const n = Math.min(g.pts.length, Math.floor(prog - g.start) + 1);
        drawCord(g.pts.slice(0, n));
      }
      ctx.restore();

      // Aiguille et fil libre, tant que la broderie n'est pas terminée.
      const out = ease((t - T(0.7)) / T(0.14));
      const enter = ease(t / T(0.1));
      if (out < 1) {
        const head = at(Math.min(prog, total));
        const [hx, hy] = toScreen(head.p);
        const ahead = head.seg.jump ? head.seg.pts[1] : head.seg.pts[Math.min(head.seg.pts.length - 1, head.i + 6)];
        const behind = head.seg.jump ? head.seg.pts[0] : head.seg.pts[Math.max(0, head.i - 6)];
        let ang = Math.atan2(ahead[1] - behind[1], ahead[0] - behind[0]);
        if (!Number.isFinite(ang)) ang = 0;
        // Le geste de la main : l'aiguille plonge et ressort à chaque point.
        const bob = Math.sin(prog * 0.32) * 0.18 * (1 - out);
        const len = Math.max(70, 120 * s);
        const lift = head.lift * 26 * s + (1 - enter) * 160 + out * 220;
        const nx = hx + lift * 0.4;
        const ny = hy - lift;
        const a = ang - 0.55 + bob;
        const tail: P = [nx - Math.cos(a) * len * 0.92, ny - Math.sin(a) * len * 0.92];
        // Fil libre qui relie le dernier point brodé au chas de l'aiguille.
        ctx.strokeStyle = rgba(THREAD, 0.9 * (1 - out));
        ctx.lineWidth = Math.max(1.4, 2.2 * s);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.quadraticCurveTo((hx + tail[0]) / 2 - 24 * s, (hy + tail[1]) / 2 + 30 * s, tail[0], tail[1]);
        ctx.quadraticCurveTo(tail[0] - 40 * s, tail[1] - 10 * s, tail[0] - 70 * s, tail[1] + 26 * s);
        ctx.stroke();
        ctx.save();
        ctx.globalAlpha = enter * (1 - out);
        ctx.translate(tail[0], tail[1]);
        ctx.rotate(a);
        ctx.translate(-len * 0.075, 0);
        drawNeedle(ctx, len, Math.max(3, len * 0.05 + head.lift * 6));
        ctx.restore();
      }

      if (systemReduced) return; // version fixe : une seule image
      if (Number.isFinite(freeze) || t < DURATION + 700) raf.current = requestAnimationFrame(frame);
      else finish();
    };
    let still = 0;
    if (systemReduced) {
      // Logo brodé terminé, affiché en fondu (CSS), puis retrait sans balayage.
      raf.current = requestAnimationFrame(() => frame(start + T(0.9)));
      still = window.setTimeout(finish, 2200);
    } else raf.current = requestAnimationFrame(frame);

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf.current);
      clearTimeout(still);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [skip, systemReduced, mobileMode, version, finish]);

  useEffect(() => {
    if (!visible) document.body.style.overflow = "";
  }, [visible]);

  if (!visible || skip) return null;

  return (
    <div
      className="fixed inset-0 z-[100] transition-[clip-path,opacity] duration-[900ms] ease-[var(--ease-cloth)]"
      style={
        systemReduced
          ? { background: BEIGE, opacity: phase === 2 ? 0 : 1 }
          : { background: BEIGE, clipPath: phase === 2 ? "inset(0 0 100% 0)" : "inset(0 0 0% 0)" }
      }
      role="dialog"
      aria-label={`Introduction animée : ${storeName}`}
      data-testid="intro"
    >
      <canvas ref={canvas} className="absolute inset-0" aria-hidden />
      <p
        className="pointer-events-none absolute inset-x-0 top-[66vh] text-center font-display text-lg italic text-ink-soft transition-all duration-1000 ease-[var(--ease-cloth)] md:text-xl"
        style={{ opacity: phase >= 1 ? 1 : 0, transform: `translateY(${phase >= 1 ? 0 : 14}px)` }}
      >
        {line1}
        <br />
        {line2}
      </p>
      <button
        type="button"
        onClick={finish}
        className="absolute bottom-6 right-6 rounded-full border border-ink/30 bg-paper/70 px-5 py-2.5 text-xs uppercase tracking-[0.18em] backdrop-blur transition-colors hover:bg-ink hover:text-paper"
      >
        Passer l&apos;introduction
      </button>
    </div>
  );
}
