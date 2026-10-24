"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { garments } from "@/lib/garments";
import { useMediaQuery } from "@/lib/use-media-query";
import { useMotionPref } from "@/components/ui/MotionPref";

/**
 * « Le vêtement prend vie » — introduction animée (Canvas 2D).
 *
 * 1. La matière : des fibres apparaissent et flottent.
 * 2. L'assemblage : elles convergent et dessinent la silhouette d'un vêtement.
 * 3. La naissance : le tissu se matérialise.
 * 4. L'entrée : le logo apparaît, puis la page d'accueil se révèle.
 *
 * Durée ~5 s (version complète) ou ~3,2 s (version allégée), passable à tout moment
 * (bouton, touche Échap). Jamais rejouée tant que la version de l'intro ne change pas.
 * Désactivée si l'utilisateur préfère réduire les animations.
 */

type Props = {
  storeName: string;
  line1: string;
  line2: string;
  version: number;
  mobileMode: "full" | "light" | "off";
  /** Visuel détouré facultatif qui remplace la silhouette dessinée à la « naissance ». */
  garmentImageUrl?: string;
};

const COLORS = ["#B5562F", "#2F4A3A", "#1E1B17", "#C2923A", "#9A4523", "#6F675D", "#E3B9B3"];
const STAGES = ["La matière", "L'assemblage", "La naissance", ""];

type Fiber = {
  x: number;
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  angle: number;
  tAngle: number;
  len: number;
  curve: number;
  color: string;
  delay: number;
  drift: number;
  width: number;
};

/** Vrai dès que l'intro a été jouée ou passée pendant cette visite. */
export const introState = { done: false };

export function Intro({ storeName, line1, line2, version, mobileMode, garmentImageUrl }: Props) {
  const { reduced } = useMotionPref();
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState(0); // 0..3 étapes, 4 = sortie
  const canvas = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const ended = useRef(false);

  const finish = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    introState.done = true;
    cancelAnimationFrame(raf.current);
    document.cookie = `aune_intro=${version}; path=/; max-age=31536000; samesite=lax`;
    setPhase(4);
    setTimeout(() => setVisible(false), 700);
  }, [version]);

  const compact = useMediaQuery("(max-width: 767px), (pointer: coarse)");
  // Pas d'animation du tout : mouvement réduit demandé, ou mobile avec l'intro désactivée.
  const skip = reduced || (compact && mobileMode === "off");

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    if (skip) {
      ended.current = true;
      introState.done = true;
      document.cookie = `aune_intro=${version}; path=/; max-age=31536000; samesite=lax`;
      return;
    }
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const lowPower =
      (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || nav.connection?.saveData === true;
    const light = (isMobile && mobileMode === "light") || lowPower;

    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return finish();

    const dpr = light ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    el.width = W * dpr;
    el.height = H * dpr;
    el.style.width = `${W}px`;
    el.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    // Géométrie du vêtement (repère 400×1000) ajustée à l'écran.
    const shape = garments.dress;
    const [cx0, cy0, cw, ch] = shape.crop;
    const scale = Math.min((H * 0.52) / ch, (W * 0.7) / cw);
    const ox = W / 2 - (cx0 + cw / 2) * scale;
    const oy = H * 0.4 - (cy0 + ch / 2) * scale;
    const outline = new Path2D(shape.body);
    const svgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svgPath.setAttribute("d", shape.body);
    const total = svgPath.getTotalLength();

    const count = light ? 70 : W < 900 ? 140 : 240;
    const DURATION = light ? 3200 : 5000;
    const T = (f: number) => f * DURATION;

    // Cibles : les 2/3 sur le contour, le reste à l'intérieur (lignes de trame).
    const targets: { x: number; y: number; a: number }[] = [];
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // isPointInPath dans le repère du vêtement
    for (let i = 0; i < count; i++) {
      if (i % 3 !== 2) {
        const l = (i / count) * total;
        const p = svgPath.getPointAtLength(l);
        const q = svgPath.getPointAtLength(Math.min(total, l + 2));
        targets.push({ x: p.x * scale + ox, y: p.y * scale + oy, a: Math.atan2(q.y - p.y, q.x - p.x) });
      } else {
        // Point intérieur aléatoire (rejet hors silhouette)
        let x = 0;
        let y = 0;
        for (let k = 0; k < 20; k++) {
          x = cx0 + Math.random() * cw;
          y = cy0 + Math.random() * ch;
          if (ctx.isPointInPath(outline, x, y)) break;
        }
        targets.push({ x: x * scale + ox, y: y * scale + oy, a: Math.PI / 2 + (Math.random() - 0.5) * 0.3 });
      }
    }
    ctx.restore();

    const fibers: Fiber[] = targets.map((t) => {
      const sx = Math.random() * W;
      const sy = Math.random() * H;
      return {
        x: sx,
        y: sy,
        sx,
        sy,
        tx: t.x,
        ty: t.y,
        angle: Math.random() * Math.PI * 2,
        tAngle: t.a,
        len: 14 + Math.random() * 46,
        curve: (Math.random() - 0.5) * 24,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.12,
        drift: Math.random() * Math.PI * 2,
        width: 0.6 + Math.random() * 1.1,
      };
    });

    const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
    const easeInOut = (t: number) => {
      t = Math.min(1, Math.max(0, t));
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    let garment: HTMLImageElement | null = null;
    if (garmentImageUrl) {
      garment = new Image();
      garment.src = garmentImageUrl;
    }
    const start = performance.now();
    let lastPhase = -1;

    const frame = (now: number) => {
      const t = now - start;
      const p = t / DURATION;
      const ph = p < 0.26 ? 0 : p < 0.56 ? 1 : p < 0.78 ? 2 : 3;
      if (ph !== lastPhase) {
        lastPhase = ph;
        setPhase(ph);
      }
      ctx.clearRect(0, 0, W, H);

      // Étape 3 : le tissu se matérialise.
      const birth = easeInOut((t - T(0.52)) / T(0.26));
      if (birth > 0 && garment?.complete && garment.naturalWidth) {
        // Visuel fourni par la boutique, ajusté dans le cadre de la silhouette.
        const r = Math.min(cw / garment.naturalWidth, ch / garment.naturalHeight);
        const w = garment.naturalWidth * r;
        const h = garment.naturalHeight * r;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(scale, scale);
        ctx.globalAlpha = birth;
        ctx.drawImage(garment, cx0 + (cw - w) / 2, cy0 + (ch - h) / 2, w, h);
        ctx.restore();
      } else if (birth > 0) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(scale, scale);
        ctx.globalAlpha = birth;
        ctx.fillStyle = "#B5562F";
        ctx.fill(outline);
        // Trame
        ctx.clip(outline);
        ctx.globalAlpha = birth * 0.18;
        ctx.strokeStyle = "#1E1B17";
        ctx.lineWidth = 0.6;
        for (let y = cy0; y < cy0 + ch; y += 5) {
          ctx.beginPath();
          ctx.moveTo(cx0, y);
          ctx.lineTo(cx0 + cw, y);
          ctx.stroke();
        }
        // Lumière
        const g = ctx.createLinearGradient(cx0, 0, cx0 + cw, 0);
        g.addColorStop(0, "rgba(0,0,0,.25)");
        g.addColorStop(0.5, "rgba(255,255,255,.12)");
        g.addColorStop(1, "rgba(0,0,0,.28)");
        ctx.globalAlpha = birth;
        ctx.fillStyle = g;
        ctx.fillRect(cx0, cy0, cw, ch);
        ctx.restore();
      }

      // Étape 2 : un fil trace la silhouette.
      const trace = ease((t - T(0.3)) / T(0.36));
      if (trace > 0 && birth < 1) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(scale, scale);
        ctx.setLineDash([total * trace, total]);
        ctx.strokeStyle = "#1E1B17";
        ctx.globalAlpha = 0.8 * (1 - birth);
        ctx.lineWidth = 1.4 / scale;
        ctx.stroke(outline);
        ctx.restore();
      }

      // Étapes 1 et 2 : les fibres.
      const fiberAlpha = 1 - ease((t - T(0.62)) / T(0.18));
      if (fiberAlpha > 0) {
        for (const f of fibers) {
          const appear = ease((p - f.delay * 0.5) / 0.1);
          const move = easeInOut((t - T(0.22 + f.delay)) / T(0.36));
          const wob = Math.sin(t / 600 + f.drift) * 14 * (1 - move);
          f.x = f.sx + (f.tx - f.sx) * move + wob;
          f.y = f.sy + (f.ty - f.sy) * move + Math.cos(t / 700 + f.drift) * 10 * (1 - move) - (1 - move) * t * 0.004;
          const a = f.angle + (f.tAngle - f.angle) * move + (1 - move) * t * 0.0004;
          const len = f.len * (1 - move * 0.6);
          const dx = (Math.cos(a) * len) / 2;
          const dy = (Math.sin(a) * len) / 2;
          ctx.globalAlpha = appear * fiberAlpha * 0.9;
          ctx.strokeStyle = f.color;
          ctx.lineWidth = f.width;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(f.x - dx, f.y - dy);
          ctx.quadraticCurveTo(f.x - dy * (f.curve / 20), f.y + dx * (f.curve / 20), f.x + dx, f.y + dy);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      if (t < DURATION + 900) raf.current = requestAnimationFrame(frame);
      else finish();
    };
    raf.current = requestAnimationFrame(frame);

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [skip, mobileMode, version, finish, garmentImageUrl]);

  useEffect(() => {
    if (!visible) document.body.style.overflow = "";
  }, [visible]);

  if (!visible || skip) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-paper transition-[clip-path,opacity] duration-700 ease-[var(--ease-cloth)]"
      style={{ clipPath: phase === 4 ? "inset(0 0 100% 0)" : "inset(0 0 0% 0)" }}
      role="dialog"
      aria-label="Introduction animée"
      data-testid="intro"
    >
      <canvas ref={canvas} className="absolute inset-0" aria-hidden />
      <p className="eyebrow absolute left-1/2 top-8 -translate-x-1/2 transition-opacity duration-500" aria-hidden>
        {STAGES[Math.min(phase, 3)]}
      </p>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-[7vh] flex flex-col items-center gap-4 text-center transition-all duration-1000 ease-[var(--ease-cloth)]"
        style={{ opacity: phase >= 3 ? 1 : 0, transform: `translateY(${phase >= 3 ? 0 : 20}px)` }}
      >
        <p
          className="font-display text-5xl transition-[letter-spacing] duration-[1400ms] ease-[var(--ease-cloth)] md:text-7xl"
          style={{ letterSpacing: phase >= 3 ? "0.32em" : "0.05em", paddingLeft: phase >= 3 ? "0.32em" : "0.05em" }}
        >
          {storeName.toUpperCase()}
        </p>
        <p className="font-display text-lg italic text-ink-soft md:text-xl">
          {line1}
          <br />
          {line2}
        </p>
      </div>
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
