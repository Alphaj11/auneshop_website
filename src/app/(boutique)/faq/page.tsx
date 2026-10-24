import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Questions fréquentes", alternates: { canonical: "/faq" } };

export default async function Page() {
  const { shipping, store } = await getSettings();
  const faq = [
    ["Comment fonctionne la précommande ?", shipping.preorderText],
    ["Quels sont les délais de livraison ?", shipping.delayText],
    ["Puis-je retourner un article ?", "Oui, sous 14 jours après réception. Voir la page Livraison et retours."],
    ["Comment choisir ma taille ?", "Chaque fiche produit comporte un guide des tailles. En cas de doute, écrivez-nous."],
    ["Mes données de paiement sont-elles stockées ?", "Non. Le paiement est traité par Stripe ; la boutique ne voit ni ne stocke jamais votre numéro de carte."],
    ["Comment vous contacter ?", `Par email à ${store.email} ou via le formulaire de contact.`],
  ];
  return (
    <div className="mx-auto max-w-3xl px-5 pb-10 pt-32 md:pt-40">
      <h1 className="display-lg">Questions fréquentes</h1>
      <p className="mt-3 text-sm text-ink-mute">Réponses d&apos;exemple, à adapter.</p>
      <div className="mt-10 border-t border-line">
        {faq.map(([q, a]) => (
          <details key={q} className="group border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between py-6 font-display text-xl">
              {q}
              <span className="text-2xl transition-transform group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="pb-6 leading-relaxed text-ink-soft">{a}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }) }} />
    </div>
  );
}
