/** Logo « au·ne » (fichier fourni par la marque), en bordeaux sur fond clair ou en blanc sur fond sombre. */
export function Logo({ tone = "bordeaux", className = "h-8 w-auto", alt = "" }: { tone?: "bordeaux" | "blanc"; className?: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/brand/logo-${tone}.png`} width={605} height={173} alt={alt} className={className} draggable={false} />
  );
}
