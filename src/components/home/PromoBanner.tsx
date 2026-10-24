import Link from "next/link";

export function PromoBanner({ text, href }: { text: string; href?: string }) {
  const items = Array.from({ length: 6 }, (_, i) => (
    <span key={i} className="flex items-center gap-10 pr-10">
      {text}
      <span aria-hidden>✶</span>
    </span>
  ));
  const inner = (
    <div className="flex w-max animate-[marquee_40s_linear_infinite] whitespace-nowrap motion-reduce:animate-none">
      {items}
      {items}
    </div>
  );
  return (
    <div className="overflow-hidden bg-ink py-3 text-xs uppercase tracking-[0.2em] text-paper">
      <p className="sr-only">{text}</p>
      <div aria-hidden>{href ? <Link href={href} tabIndex={-1}>{inner}</Link> : inner}</div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}
