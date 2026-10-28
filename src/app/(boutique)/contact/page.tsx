import type { Metadata } from "next";
import Link from "next/link";
import { InquiryForm } from "@/components/account/AccountForms";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

/** Réponses rapides : les pages qui répondent déjà aux questions les plus fréquentes. */
const RESOURCES = [
  { href: "/faq", label: "Questions fréquentes", text: "Tailles, entretien, précommande, paiement." },
  { href: "/livraison-retours", label: "Livraison et retours", text: "Délais, frais, droit de rétractation." },
  { href: "/atelier", label: "L'atelier sur mesure", text: "Ajuster une pièce à vos mesures." },
  { href: "/le-projet", label: "Le projet", text: "Pourquoi Aune, et avec qui." },
  { href: "/cgv", label: "Conditions générales de vente", text: "Le cadre de vos commandes." },
];

/** Réseaux de la marque (relevés sur auneshop.fr) ; remplacés par ceux des réglages s'ils sont renseignés. */
const DEFAULT_SOCIAL = {
  instagram: "https://www.instagram.com/aune_collection/",
  facebook: "https://www.facebook.com/aunecollection/",
  tiktok: "https://www.tiktok.com/@lena_creeaune",
  pinterest: "https://fr.pinterest.com/aune_collection/",
};

export default async function Page() {
  const [{ store, social }, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const links = (Object.keys(DEFAULT_SOCIAL) as (keyof typeof DEFAULT_SOCIAL)[]).map((k) => ({
    name: k[0].toUpperCase() + k.slice(1),
    href: social[k] || DEFAULT_SOCIAL[k],
  }));
  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-32 md:px-10 md:pt-40">
      <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="eyebrow">Contact</p>
          <h1 className="display-lg mt-3">Écrire à l&apos;atelier</h1>
          <p className="mt-6 text-ink-soft">Une question sur une pièce, une taille, une commande ? Nous répondons sous 48 h ouvrées.</p>
          <p className="mt-8 text-sm">
            {store.email}
            <br />
            {store.phone}
            <br />
            {store.address}
          </p>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Réseaux sociaux">
            {links.map((l) => (
              <li key={l.name}>
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="link-underline">
                  {l.name} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
        <InquiryForm name={user ? `${user.firstName} ${user.lastName}`.trim() : undefined} email={user?.email} />
      </div>

      <section className="mt-24 border-t border-line pt-12" aria-labelledby="ressources-titre">
        <h2 id="ressources-titre" className="display-md">
          Avant d&apos;écrire, peut-être la réponse est-elle ici
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {RESOURCES.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className="group block h-full rounded-[3px] border border-line p-5 transition-colors hover:border-ink">
                <p className="font-display text-xl">{r.label}</p>
                <p className="mt-2 text-sm text-ink-soft">{r.text}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-ink-soft group-hover:text-ink">Voir →</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
