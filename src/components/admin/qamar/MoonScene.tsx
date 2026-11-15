import type { QamarStatus } from "@/lib/qamar";

/**
 * Nuit de Qamar (« lune » en arabe) : ciel étoilé, pleine lune basse, crêtes dans la brume
 * et, au loin sur un rocher, un loup qui hurle, en contre-jour sur la lune.
 * Entièrement dessinée en SVG ; les étoiles scintillent et les nuages glissent, sauf si
 * les animations sont réduites.
 */

// Étoiles stables d'un rendu à l'autre (générateur pseudo-aléatoire à graine fixe).
function stars(count: number) {
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: count }, (_, i) => ({ x: r() * 1600, y: r() * 560, size: r() < 0.08 ? 1.6 : 0.5 + r() * 0.8, delay: (r() * 6).toFixed(2), twinkle: i % 5 === 0 }));
}
const STARS = stars(170);

/** Loup assis, museau levé vers la lune ; les pattes reposent sur y = 0. */
const WOLF =
  "M44 0 C52 -1 60 -3 62 -7 C56 -5 48 -5 40 -6 C40 -16 38 -30 30 -44 C26 -54 20 -62 14 -68 C12 -76 8 -86 4 -94 L6 -110 L-1 -101 C-6 -105 -12 -110 -18 -116 L-27 -125 C-28 -122 -26 -118 -24 -115 C-20 -110 -16 -104 -14 -99 C-17 -92 -18 -84 -16 -76 C-19 -70 -18 -62 -14 -56 C-14 -40 -15 -20 -17 -4 L-23 0 L-8 0 C-7 -10 -6 -22 -3 -36 C2 -28 7 -18 9 -8 L4 0 Z";

export function MoonScene() {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="h-full w-full" aria-hidden focusable="false">
      <defs>
        <linearGradient id="q-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#03050a" />
          <stop offset=".55" stopColor="#0a1322" />
          <stop offset="1" stopColor="#18233a" />
        </linearGradient>
        <radialGradient id="q-glow" cx="1180" cy="560" r="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f3ead2" stopOpacity=".32" />
          <stop offset=".35" stopColor="#c9c2ae" stopOpacity=".1" />
          <stop offset="1" stopColor="#0a1322" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="q-moon" cx="1130" cy="500" r="260" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fbf6e9" />
          <stop offset=".7" stopColor="#e9e1cb" />
          <stop offset="1" stopColor="#c8bfa6" />
        </radialGradient>
        <linearGradient id="q-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b97ad" stopOpacity="0" />
          <stop offset=".6" stopColor="#8b97ad" stopOpacity=".16" />
          <stop offset="1" stopColor="#8b97ad" stopOpacity="0" />
        </linearGradient>
        <filter id="q-blur" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <clipPath id="q-moon-clip">
          <circle cx="1180" cy="560" r="215" />
        </clipPath>
      </defs>
      <style>{`
        .q-tw { animation: q-tw 5s ease-in-out infinite; }
        .q-cloud { animation: q-drift 90s linear infinite alternate; }
        @keyframes q-tw { 0%,100% { opacity: .9 } 50% { opacity: .2 } }
        @keyframes q-drift { from { transform: translateX(-120px) } to { transform: translateX(160px) } }
        @media (prefers-reduced-motion: reduce) { .q-tw, .q-cloud { animation: none } }
        :root[data-motion="off"] .q-tw, :root[data-motion="off"] .q-cloud { animation: none }
      `}</style>

      <rect width="1600" height="900" fill="url(#q-sky)" />
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.size} fill="#f4efe2" opacity={s.twinkle ? 0.9 : 0.55} className={s.twinkle ? "q-tw" : undefined} style={s.twinkle ? { animationDelay: `${s.delay}s` } : undefined} />
      ))}

      {/* Pleine lune et son halo */}
      <circle cx="1180" cy="560" r="560" fill="url(#q-glow)" />
      <circle cx="1180" cy="560" r="215" fill="url(#q-moon)" />
      <g clipPath="url(#q-moon-clip)" fill="#9c947e">
        <ellipse cx="1110" cy="470" rx="62" ry="44" opacity=".22" />
        <ellipse cx="1240" cy="430" rx="38" ry="30" opacity=".18" />
        <ellipse cx="1260" cy="560" rx="70" ry="52" opacity=".16" />
        <ellipse cx="1090" cy="610" rx="44" ry="34" opacity=".2" />
        <ellipse cx="1190" cy="680" rx="30" ry="22" opacity=".18" />
        <circle cx="1300" cy="650" r="14" opacity=".25" />
        <circle cx="1060" cy="540" r="10" opacity=".25" />
        <circle cx="1170" cy="380" r="9" opacity=".22" />
      </g>

      {/* Voile de nuages qui passe devant la lune */}
      <g className="q-cloud" filter="url(#q-blur)" fill="#1d2840" opacity=".55">
        <ellipse cx="1050" cy="430" rx="260" ry="22" />
        <ellipse cx="1320" cy="500" rx="180" ry="16" />
      </g>

      {/* Crêtes lointaines */}
      <path d="M0 640 C160 600 280 620 420 590 C560 560 640 600 780 585 C900 572 1000 640 1100 662 L1600 684 L1600 900 L0 900 Z" fill="#131c2e" />
      <rect y="560" width="1600" height="140" fill="url(#q-mist)" />
      <path d="M0 720 C140 690 260 700 380 676 C520 650 620 690 760 680 C880 672 960 650 1060 664 C1120 672 1150 686 1190 690 L1600 700 L1600 900 L0 900 Z" fill="#0b121f" />

      {/* Le rocher, quelques sapins et le loup en contre-jour */}
      <path d="M760 900 L760 790 C860 770 960 760 1040 735 C1100 712 1140 662 1172 632 L1186 626 C1204 628 1222 650 1250 690 C1320 750 1460 772 1600 780 L1600 900 Z" fill="#05080f" />
      <g fill="#05080f">
        <path d="M880 776 l14 -46 l14 46 Z M884 752 l10 -34 l10 34 Z M886 732 l8 -26 l8 26 Z" />
        <path d="M1420 778 l16 -54 l16 54 Z M1424 752 l12 -40 l12 40 Z M1427 728 l9 -30 l9 30 Z" />
        <path d="M1480 784 l12 -38 l12 38 Z M1483 764 l9 -28 l9 28 Z" />
      </g>
      <path d={WOLF} fill="#05080f" transform="translate(1180 630) scale(.66)" />

      {/* Brume au ras du sol */}
      <rect y="780" width="1600" height="120" fill="url(#q-mist)" opacity=".8" />
    </svg>
  );
}

/**
 * Fond de page de Qamar : la scène reste fixée à l'écran pendant que le contenu défile.
 * Annule les marges du cadre d'administration pour occuper toute la zone.
 */
export function QamarNight({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative -mx-4 -my-8 min-h-[calc(100dvh-3.5rem)] bg-[#03050a] text-[#f4efe2] md:-mx-8">
      <div aria-hidden className="pointer-events-none sticky top-14 h-[calc(100dvh-3.5rem)] overflow-hidden">
        <MoonScene />
        {/* Assombrit le côté du texte pour garder un contraste confortable. */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#03050a]/85 via-[#03050a]/45 to-transparent" />
      </div>
      <div className="relative -mt-[calc(100dvh-3.5rem)] px-4 py-10 md:px-8 md:py-12">{children}</div>
    </div>
  );
}

export const nightInput =
  "w-full rounded border border-white/20 bg-[#0b1322]/80 px-3 py-2 text-sm text-[#f4efe2] placeholder:text-white/40 focus:border-[#e9dfc6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e9dfc6]/40";
export const nightLabel = "mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-white/70";
export const nightCard = "rounded-lg border border-white/12 bg-[#070c16]/75 backdrop-blur-md";
export const nightBtn =
  "rounded bg-[#efe6cf] px-4 py-2 text-sm font-medium text-[#0b1322] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efe6cf] disabled:opacity-50";

export const statusTone: Record<QamarStatus, string> = {
  nouveau: "bg-[#efe6cf] text-[#0b1322]",
  en_cours: "bg-[#7fa7d9]/25 text-[#cfe0f7] ring-1 ring-[#7fa7d9]/50",
  resolu: "bg-[#7fc9a0]/20 text-[#bfe9cf] ring-1 ring-[#7fc9a0]/45",
};
