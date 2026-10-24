import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { listCollections } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Collections",
  description: "Toutes les collections Aune, à explorer en vue immersive ou en grille.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  const collections = await listCollections();
  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-32 md:px-10 md:pt-40">
      <p className="eyebrow">Explorer</p>
      <h1 className="display-xl mt-4">Collections</h1>
      <div className="mt-16 grid gap-x-6 gap-y-20 md:grid-cols-12">
        {collections.map((c, i) => {
          // Compositions alternées pour éviter une grille de cartes identiques.
          const layout = ["md:col-span-7", "md:col-span-5 md:mt-40", "md:col-span-5", "md:col-span-6 md:col-start-7 md:-mt-24"][i % 4];
          return (
            <Reveal key={c.id} className={layout} delay={(i % 2) * 0.1}>
              <Link href={`/collections/${c.slug}`} className="group block">
                <div className="relative aspect-[6/5] overflow-hidden rounded-[3px] bg-paper-2">
                  {c.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.coverImageUrl} alt="" loading={i < 2 ? "eager" : "lazy"} className="h-full w-full object-cover transition-transform duration-[1.6s] ease-[var(--ease-cloth)] group-hover:scale-105" />
                  )}
                  <span className="absolute bottom-4 left-4 rounded-full bg-paper/90 px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                    {c.displayMode === "immersive" && c.immersiveEnabled ? "Vue immersive" : "Vue grille"}
                  </span>
                </div>
                <div className="mt-5 flex items-baseline justify-between gap-4">
                  <h2 className="display-md">{c.name}</h2>
                  <span className="text-xs tabular-nums text-ink-mute">0{i + 1}</span>
                </div>
                <p className="mt-2 text-sm text-ink-soft">{c.tagline}</p>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
