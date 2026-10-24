import type { Metadata } from "next";
import { LegalPage } from "@/components/shop/LegalPage";

export const metadata: Metadata = { title: "Gestion des cookies", alternates: { canonical: "/cookies" } };

export default function Page() {
  return (
    <LegalPage title="Gestion des cookies">
      <p>Le site n&apos;utilise actuellement <strong>aucun cookie publicitaire ni de mesure d&apos;audience</strong>. Seuls des cookies strictement nécessaires, exemptés de consentement, sont déposés :</p>
      <ul className="list-disc space-y-2 pl-6">
        <li><strong>aune_session</strong> : maintien de la connexion à votre compte (30 jours, 12 h pour l&apos;équipe).</li>
        <li><strong>aune_cart</strong> : conservation de votre panier (60 jours).</li>
        <li><strong>aune_intro</strong> : mémorise que l&apos;introduction animée a été vue (1 an).</li>
        <li><strong>aune_motion</strong> : mémorise votre choix d&apos;activer ou non les animations (1 an).</li>
      </ul>
      <p>Si un outil de mesure d&apos;audience ou de marketing est ajouté, un bandeau de consentement devra être mis en place avant tout dépôt (refus aussi simple que l&apos;acceptation).</p>
    </LegalPage>
  );
}
