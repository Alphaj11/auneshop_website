/** Logo « au·ne » (fichier fourni par la marque), en vert forêt (thème sauge), bordeaux, ou blanc sur fond sombre. */
export function Logo({
  tone = "foret",
  className = "h-8 w-auto",
  alt = "",
}: {
  tone?: "foret" | "bordeaux" | "blanc";
  className?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/brand/logo-${tone}.png`} width={605} height={173} alt={alt} className={className} draggable={false} />
  );
}
