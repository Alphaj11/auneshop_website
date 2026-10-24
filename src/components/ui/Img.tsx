import Image from "next/image";

/**
 * Image du catalogue. Les visuels SVG de démonstration sont servis tels quels ;
 * les photos (JPEG, PNG, WebP, AVIF) passent par l'optimiseur de Next.js.
 */
export function Img({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  fill = true,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
}) {
  if (src.endsWith(".svg")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`${fill ? "absolute inset-0 h-full w-full" : ""} ${className ?? ""}`}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
      />
    );
  }
  return <Image src={src} alt={alt} fill={fill} sizes={sizes} priority={priority} className={className} quality={85} />;
}
