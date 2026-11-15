"use client";

import { useEffect, useRef } from "react";
import { useMotionPref } from "@/components/ui/MotionPref";

/**
 * Illustration originale : une mère en sari et son enfant, dessinés en SVG. Leurs regards
 * (et un léger mouvement de tête) suivent le curseur ; au toucher, ils promènent
 * doucement les yeux ; immobiles si les animations sont réduites.
 */

type Eye = { cx: number; cy: number; d: string; r: number; who: "m" | "c" };

const EYES: Eye[] = [
  { who: "m", cx: 192, cy: 182, r: 5.4, d: "M178 183 C184 174.5 199 173.5 206 182 C199 188.5 185 189.5 178 183 Z" },
  { who: "m", cx: 238, cy: 182, r: 5.4, d: "M224 182 C231 173.5 246 174.5 252 183 C245 189.5 231 188.5 224 182 Z" },
  { who: "c", cx: 124, cy: 321, r: 5, d: "M113 322 C116 313.5 131 313 135 321.5 C131 328 117 329 113 322 Z" },
  { who: "c", cx: 158, cy: 321, r: 5, d: "M147 321.5 C151 313 166 313.5 169 322 C165 329 151 328 147 321.5 Z" },
];

function EyeShape({ eye, i }: { eye: Eye; i: number }) {
  const lid = eye.d.split(" C")[0] + " C" + eye.d.split(" C")[1];
  return (
    <g data-eye={eye.who} className="mc-eye">
      <clipPath id={`mc-eye-${i}`}>
        <path d={eye.d} />
      </clipPath>
      <path d={eye.d} fill="#F6EEE3" />
      <g clipPath={`url(#mc-eye-${i})`}>
        {/* Ombre de la paupière sur le blanc de l'œil */}
        <path d={eye.d} fill="url(#mc-lidshade)" />
        <g data-iris={eye.who} data-cx={eye.cx} data-cy={eye.cy}>
          <circle cx={eye.cx} cy={eye.cy} r={eye.r} fill="url(#mc-iris)" />
          <circle cx={eye.cx} cy={eye.cy} r={eye.r * 0.45} fill="#0d0704" />
          <circle cx={eye.cx - eye.r * 0.32} cy={eye.cy - eye.r * 0.35} r={eye.r * 0.24} fill="#fff" opacity=".9" />
        </g>
      </g>
      {/* Paupière supérieure et cils */}
      <path d={lid} fill="none" stroke="#1d110a" strokeWidth={eye.who === "m" ? 2.4 : 1.8} strokeLinecap="round" />
    </g>
  );
}

export function MotherChild() {
  const svg = useRef<SVGSVGElement>(null);
  const { reduced } = useMotionPref();

  useEffect(() => {
    const root = svg.current;
    if (!root || reduced) return;
    const irises = [...root.querySelectorAll<SVGGElement>("[data-iris]")];
    const heads = { m: root.querySelector<SVGGElement>("[data-head=m]"), c: root.querySelector<SVGGElement>("[data-head=c]") };
    const coarse = matchMedia("(pointer: coarse)").matches;
    const pointer = { x: 0, y: 0, active: false };
    const state = irises.map(() => ({ x: 0, y: 0 }));
    const head = { m: 0, c: 0 };
    let raf = 0;
    let visible = true;

    const frame = (t: number) => {
      raf = 0;
      const box = root.getBoundingClientRect();
      const scale = box.width / 400;
      let px = pointer.x;
      let py = pointer.y;
      if (coarse || !pointer.active) {
        // Regard qui se promène doucement, revenant souvent vers le visiteur.
        const s = t / 1000;
        const wander = Math.max(0, Math.sin(s * 0.45));
        px = box.left + box.width / 2 + Math.sin(s * 0.7) * box.width * 0.9 * wander;
        py = box.top + box.height * 0.35 + Math.cos(s * 0.53) * box.height * 0.25 * wander;
      }
      let moving = false;
      const avg = { m: 0, c: 0 };
      irises.forEach((g, i) => {
        const cx = box.left + Number(g.dataset.cx) * scale;
        const cy = box.top + Number(g.dataset.cy) * scale;
        const dx = px - cx;
        const dy = py - cy;
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / (220 * scale + 60));
        const max = g.dataset.iris === "m" ? 4.2 : 3.6;
        const tx = (dx / d) * k * max;
        const ty = (dy / d) * k * max * 0.6;
        const s = state[i];
        s.x += (tx - s.x) * 0.14;
        s.y += (ty - s.y) * 0.14;
        if (Math.abs(tx - s.x) + Math.abs(ty - s.y) > 0.01) moving = true;
        g.setAttribute("transform", `translate(${s.x.toFixed(2)} ${s.y.toFixed(2)})`);
        avg[g.dataset.iris as "m" | "c"] += s.x / max / 2;
      });
      // Légère rotation de la tête dans la direction du regard.
      (["m", "c"] as const).forEach((w) => {
        head[w] += (avg[w] - head[w]) * 0.1;
        const deg = head[w] * (w === "m" ? 1.6 : 3);
        const pivot = w === "m" ? "215 285" : "140 372";
        heads[w]?.setAttribute("transform", `rotate(${deg.toFixed(2)} ${pivot}) translate(${head[w].toFixed(2)} 0)`);
      });
      if (visible && (moving || coarse || !pointer.active)) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
      kick();
    };
    const onLeave = () => {
      pointer.active = false;
      kick();
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
    });
    io.observe(root);
    addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    // Clignements, à intervalles irréguliers, chacun à son rythme.
    const timers: number[] = [];
    const blink = (who: "m" | "c") => {
      root.querySelectorAll<SVGGElement>(`[data-eye=${who}]`).forEach((el) => {
        el.classList.add("is-blinking");
        timers.push(window.setTimeout(() => el.classList.remove("is-blinking"), 140));
      });
      timers.push(window.setTimeout(() => blink(who), 2800 + Math.random() * 3800));
    };
    timers.push(window.setTimeout(() => blink("m"), 1800), window.setTimeout(() => blink("c"), 3100));
    kick();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      timers.forEach(clearTimeout);
      removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  return (
    <svg ref={svg} viewBox="0 0 400 600" className="h-full w-full" role="img" aria-labelledby="mc-titre">
      <title id="mc-titre">Illustration : une mère en sari bordeaux tient son enfant contre elle ; tous deux sourient.</title>
      <defs>
        <radialGradient id="mc-bg" cx="52%" cy="34%" r="75%">
          <stop offset="0" stopColor="#F6E8CF" />
          <stop offset=".55" stopColor="#E6CBA3" />
          <stop offset="1" stopColor="#C99A6B" />
        </radialGradient>
        <radialGradient id="mc-skin" cx="40%" cy="32%" r="75%">
          <stop offset="0" stopColor="#CF9466" />
          <stop offset=".6" stopColor="#B07045" />
          <stop offset="1" stopColor="#8A5131" />
        </radialGradient>
        <radialGradient id="mc-skin-child" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#D9A174" />
          <stop offset=".65" stopColor="#BC7D50" />
          <stop offset="1" stopColor="#97603A" />
        </radialGradient>
        <linearGradient id="mc-skin-limb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C2835A" />
          <stop offset="1" stopColor="#8E5434" />
        </linearGradient>
        <linearGradient id="mc-sari" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7C1F31" />
          <stop offset=".6" stopColor="#5C1222" />
          <stop offset="1" stopColor="#3E0812" />
        </linearGradient>
        <linearGradient id="mc-kurta" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E8B65A" />
          <stop offset="1" stopColor="#B9822C" />
        </linearGradient>
        <linearGradient id="mc-hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1a12" />
          <stop offset="1" stopColor="#120a06" />
        </linearGradient>
        <radialGradient id="mc-iris" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#6b4325" />
          <stop offset="1" stopColor="#2b170b" />
        </radialGradient>
        <linearGradient id="mc-lidshade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b4a36" stopOpacity=".45" />
          <stop offset=".45" stopColor="#6b4a36" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mc-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#B8872F" />
          <stop offset=".5" stopColor="#EBC56A" />
          <stop offset="1" stopColor="#B8872F" />
        </linearGradient>
        <filter id="mc-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <style>{`
        .mc-eye { transform-box: fill-box; transform-origin: center; transition: transform .07s ease-in; }
        .mc-eye.is-blinking { transform: scaleY(.08); }
      `}</style>

      <rect width="400" height="600" fill="url(#mc-bg)" />
      {/* Halo et motif de fenêtre en arc, très discrets */}
      <circle cx="210" cy="215" r="150" fill="#FBF3E4" opacity=".45" filter="url(#mc-soft)" />
      <path d="M60 600 V250 C60 150 130 80 210 80 C290 80 360 150 360 250 V600" fill="none" stroke="#B9875A" strokeOpacity=".25" strokeWidth="2" />

      {/* ——— La mère ——— */}
      {/* Cheveux derrière les épaules */}
      <path d="M262 230 C292 270 300 330 290 400 L250 380 C262 330 258 280 246 250 Z" fill="url(#mc-hair)" />
      {/* Buste et sari */}
      <path d="M96 600 C92 480 112 372 168 312 C184 300 198 296 215 300 C232 296 248 300 262 310 C320 360 340 470 336 600 Z" fill="url(#mc-sari)" />
      {/* Chevelure sous le voile, derrière le cou */}
      <path d="M162 214 C158 258 166 290 182 308 L250 308 C266 290 272 258 268 214 Z" fill="url(#mc-hair)" />
      {/* Cou */}
      <path d="M194 246 C196 270 194 288 186 302 C200 312 230 312 244 302 C236 288 234 270 236 246 Z" fill="url(#mc-skin-limb)" />
      <path d="M190 296 C205 306 226 306 240 296" fill="none" stroke="#7a4228" strokeOpacity=".35" strokeWidth="3" />
      {/* Collier fin */}
      <path d="M190 300 C204 318 228 318 242 300" fill="none" stroke="url(#mc-gold)" strokeWidth="2.2" />
      <circle cx="216" cy="315" r="3.2" fill="#EBC56A" />
      {/* Pan du sari en diagonale sur l'épaule, bordure dorée */}
      <path d="M262 310 C230 360 200 430 186 600 L250 600 C258 470 286 380 310 338 Z" fill="#6A1627" />
      <path d="M262 310 C230 360 200 430 186 600" fill="none" stroke="url(#mc-gold)" strokeWidth="7" />
      <path d="M268 316 C238 366 210 436 197 600" fill="none" stroke="#3E0812" strokeOpacity=".5" strokeWidth="1.5" strokeDasharray="2 5" />
      {/* Plis */}
      <g fill="none" stroke="#2a0510" strokeOpacity=".35" strokeWidth="2.5" strokeLinecap="round">
        <path d="M290 420 C296 470 300 520 300 590" />
        <path d="M312 440 C318 490 320 540 318 595" />
        <path d="M232 470 C226 510 222 550 222 595" />
      </g>

      <path d="M190 258 C204 276 228 276 242 258 L240 280 C226 290 206 290 192 280 Z" fill="#5a2f1a" opacity=".35" />
      <g data-head="m">
        {/* Voile du sari posé sur la tête */}
        <path d="M148 205 C140 140 170 88 215 86 C262 88 292 140 284 210 C290 252 300 292 318 334 L296 344 C282 302 274 262 272 218 C274 152 252 118 215 116 C178 118 156 152 158 218 C154 262 144 300 128 342 L106 332 C124 292 140 252 148 205 Z" fill="url(#mc-sari)" />
        <path d="M158 218 C156 152 178 118 215 116 C252 118 274 152 272 218" fill="none" stroke="url(#mc-gold)" strokeWidth="5" />
        {/* Visage */}
        <path d="M215 120 C254 120 271 152 271 192 C271 230 250 262 215 268 C180 262 159 230 159 192 C159 152 176 120 215 120 Z" fill="url(#mc-skin)" />
        {/* Ombre du voile sur le front et les tempes */}
        <path d="M159 192 C159 152 176 122 215 122 C254 122 271 152 271 192 C262 160 242 146 215 146 C188 146 168 160 159 192 Z" fill="#5a2f1a" opacity=".22" />
        {/* Cheveux, raie au milieu */}
        <path d="M160 196 C158 150 182 122 215 122 C248 122 272 150 270 196 C264 166 248 146 219 142 L215 132 L211 142 C182 146 166 166 160 196 Z" fill="url(#mc-hair)" />
        <path d="M215 133 L215 146" stroke="#8a2a2a" strokeWidth="1.6" opacity=".7" />
        <g fill="none" stroke="#6b4a3a" strokeOpacity=".45" strokeWidth="1.2" strokeLinecap="round">
          <path d="M209 138 C190 142 174 156 166 178" />
          <path d="M221 138 C240 142 256 156 264 178" />
        </g>
        {/* Boucles d'oreilles (jhumka) */}
        <g fill="url(#mc-gold)">
          <path d="M160 214 v8 M157 222 h6 l3 9 h-12 Z" stroke="#B8872F" strokeWidth="1.2" />
          <path d="M270 214 v8 M267 222 h6 l3 9 h-12 Z" stroke="#B8872F" strokeWidth="1.2" />
        </g>
        <circle cx="160" cy="233" r="1.6" fill="#EBC56A" />
        <circle cx="270" cy="233" r="1.6" fill="#EBC56A" />

        {/* Sourcils */}
        <g fill="none" stroke="#1c110b" strokeWidth="3.2" strokeLinecap="round">
          <path d="M176 169 C184 162.5 198 162 207 167" />
          <path d="M223 167 C232 162 246 162.5 254 169" />
        </g>
        {/* Yeux */}
        <EyeShape eye={EYES[0]} i={0} />
        <EyeShape eye={EYES[1]} i={1} />
        {/* Paupières inférieures, très légères */}
        <g fill="none" stroke="#6d3d24" strokeOpacity=".45" strokeWidth="1" strokeLinecap="round">
          <path d="M181 188 C188 191 198 190.5 204 186" />
          <path d="M226 186 C232 190.5 242 191 249 188" />
        </g>
        <path d="M215 168 C214 182 214 196 216 206" stroke="#e7b48a" strokeOpacity=".45" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M171 236 C182 256 200 266 215 268 C230 266 248 256 259 236 C252 258 236 270 215 271 C194 270 178 258 171 236 Z" fill="#5a2f1a" opacity=".25" />
        {/* Bindi */}
        <circle cx="215" cy="159" r="2.6" fill="#7C1F31" />
        {/* Nez */}
        <path d="M216 186 C215 198 211 207 209 213 C212 217 219 218 223 214" fill="none" stroke="#7a4228" strokeOpacity=".55" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M206 212 C208 216 211 217 213 216 M217 216 C219 217 222 216 224 212" fill="none" stroke="#5e301b" strokeOpacity=".5" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="224.5" cy="211" r="1.5" fill="#F3D78B" />
        {/* Joues */}
        <ellipse cx="183" cy="214" rx="14" ry="9" fill="#C55B4B" opacity=".18" />
        <ellipse cx="247" cy="214" rx="14" ry="9" fill="#C55B4B" opacity=".18" />
        {/* Bouche, sourire doux */}
        <path d="M199 232 C206 228.5 211 229.5 215 231.5 C219 229.5 224 228.5 231 232 C224 235 206 235 199 232 Z" fill="#7f3029" />
        <path d="M200 233 C207 243 223 243 230 233 C223 236.5 207 236.5 200 233 Z" fill="#9e463b" />
        <path d="M209 238.5 C213 239.5 217 239.5 221 238.5" stroke="#d48a7a" strokeOpacity=".5" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M197 231 C198 232.5 199 233 200.5 233 M233 231 C232 232.5 231 233 229.5 233" stroke="#6b2a22" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>

      {/* Bras de la mère, derrière l'enfant : manche du corsage puis bras */}
      <path d="M128 400 C110 440 97 490 90 548 L122 552 C123 500 131 452 144 410 Z" fill="url(#mc-skin-limb)" />
      <path d="M152 334 C126 348 110 380 104 424 L142 428 C144 392 152 364 166 344 Z" fill="#5C1222" />
      <path d="M104 424 L142 428" stroke="url(#mc-gold)" strokeWidth="4" />

      {/* ——— L'enfant ——— */}
      {/* Jambes qui pendent sous le bras de sa mère */}
      <g fill="#F1E6D2" stroke="#cdbb9c" strokeWidth="1">
        <path d="M112 500 C108 530 108 556 112 580 L136 580 C138 556 140 530 142 504 Z" />
        <path d="M150 500 C154 528 158 552 166 574 L188 568 C182 546 178 524 176 500 Z" />
      </g>
      <path d="M108 578 C106 588 116 594 132 592 C140 590 140 582 136 578 Z" fill="url(#mc-skin-child)" />
      <path d="M164 572 C164 584 176 588 190 582 C196 578 194 570 188 566 Z" fill="url(#mc-skin-child)" />
      {/* Corps, tunique moutarde */}
      <path d="M86 520 C82 450 92 392 112 372 C128 362 154 362 170 372 C192 392 204 450 200 520 Z" fill="url(#mc-kurta)" />
      <path d="M140 372 V420" stroke="#9a6a22" strokeWidth="2" strokeOpacity=".5" />
      <g fill="#9a6a22" opacity=".6">
        <circle cx="140" cy="384" r="1.8" />
        <circle cx="140" cy="396" r="1.8" />
        <circle cx="140" cy="408" r="1.8" />
      </g>
      <path d="M120 372 C128 380 152 380 160 372" fill="none" stroke="#9a6a22" strokeWidth="3" />
      <g fill="none" stroke="#8a5a1a" strokeOpacity=".35" strokeWidth="2.5" strokeLinecap="round">
        <path d="M108 420 C104 450 102 480 104 512" />
        <path d="M182 424 C186 452 188 482 186 512" />
        <path d="M124 440 C126 470 124 495 120 512" />
      </g>
      <path d="M112 372 C128 386 152 386 170 372 C160 392 122 392 112 372 Z" fill="#6d3d10" opacity=".25" />
      {/* L'avant-bras de la mère sous l'enfant, la main posée sur sa cuisse */}
      <path d="M84 548 C120 530 172 514 222 500 C234 497 240 508 232 514 C186 532 136 554 98 574 Z" fill="url(#mc-skin-limb)" />
      <path d="M216 500 C226 488 246 486 255 495 C260 502 257 515 249 522 C242 528 231 527 225 520 Z" fill="url(#mc-skin-limb)" />
      <g fill="none" stroke="#6d3a22" strokeOpacity=".55" strokeWidth="1.3" strokeLinecap="round">
        <path d="M243 495 C249 500 251 508 249 516" />
        <path d="M236 497 C242 503 243 511 240 520" />
        <path d="M229 500 C234 506 235 513 232 520" />
      </g>
      <g fill="none" strokeWidth="2.8">
        <path d="M196 506 C199 514 202 520 205 526" stroke="url(#mc-gold)" />
        <path d="M190 508 C193 516 196 522 199 528" stroke="#7C1F31" />
        <path d="M184 510 C187 518 190 524 193 530" stroke="url(#mc-gold)" />
      </g>
      {/* Bras de l'enfant autour du cou de sa mère */}
      <path d="M176 386 C190 360 204 336 222 326 C230 322 238 326 236 334 C226 344 210 362 196 396 Z" fill="url(#mc-kurta)" />
      <path d="M224 322 C232 316 244 318 246 326 C247 333 240 338 232 336 C228 334 225 330 224 322 Z" fill="url(#mc-skin-child)" />

      <g data-head="c">
        {/* Oreilles */}
        <ellipse cx="90" cy="324" rx="7" ry="10" fill="#B5754B" />
        <ellipse cx="190" cy="324" rx="7" ry="10" fill="#B5754B" />
        {/* Visage rond */}
        <path d="M140 268 C171 268 190 292 190 322 C190 352 168 372 140 372 C112 372 90 352 90 322 C90 292 109 268 140 268 Z" fill="url(#mc-skin-child)" />
        {/* Cheveux */}
        <path d="M91 314 C86 282 110 260 140 260 C171 260 194 282 189 314 C182 294 168 284 152 286 C149 278 138 278 134 287 C118 285 100 296 91 314 Z" fill="url(#mc-hair)" />
        <path d="M134 287 C132 280 136 272 143 270" fill="none" stroke="#2a1a12" strokeWidth="3" strokeLinecap="round" />
        <path d="M110 278 C122 268 140 265 158 270" fill="none" stroke="#6b4a3a" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" />
        {/* Sourcils légers */}
        <g fill="none" stroke="#3a2416" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round">
          <path d="M114 308 C120 304 129 304 134 307" />
          <path d="M148 307 C153 304 162 304 168 308" />
        </g>
        <EyeShape eye={EYES[2]} i={2} />
        <EyeShape eye={EYES[3]} i={3} />
        {/* Nez et bouche rieuse */}
        <path d="M141 330 C139 336 139 340 143 341 C145 341 146 340 146 339" fill="none" stroke="#7a4228" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M129 349 C135 357 147 357 153 349 C147 352 135 352 129 349 Z" fill="#7f3029" />
        <path d="M133 351.5 C138 355.5 144 355.5 149 351.5" fill="#d98c7e" opacity=".6" />
        <ellipse cx="111" cy="340" rx="11" ry="7.5" fill="#D0604C" opacity=".22" />
        <ellipse cx="170" cy="340" rx="11" ry="7.5" fill="#D0604C" opacity=".22" />
      </g>
    </svg>
  );
}
