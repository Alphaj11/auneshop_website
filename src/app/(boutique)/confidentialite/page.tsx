import type { Metadata } from "next";
import { LegalPage } from "@/components/shop/LegalPage";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

export default async function Page() {
  const { store, legal } = await getSettings();
  return (
    <LegalPage title="Politique de confidentialité">
      <h2>Responsable du traitement</h2>
      <p>{legal.companyName || store.name}, joignable à {store.email}.</p>
      <h2>Données collectées et finalités</h2>
      <p><strong>Commandes</strong> : identité, coordonnées, adresse de livraison, contenu de la commande — exécution du contrat, conservées 10 ans (obligations comptables).<br />
      <strong>Compte client</strong> : identité, email, mot de passe chiffré (jamais lisible), adresses, favoris — conservées tant que le compte est actif, supprimables à tout moment depuis l&apos;espace client.<br />
      <strong>Newsletter</strong> : email et preuve du consentement — jusqu&apos;à désinscription.<br />
      <strong>Paiement</strong> : traité directement par Stripe ; aucune donnée de carte n&apos;est stockée par la boutique.</p>
      <h2>Destinataires</h2>
      <p>Prestataire de paiement (Stripe), transporteur, hébergeur, prestataire d&apos;envoi d&apos;emails — uniquement pour les besoins décrits ci-dessus.</p>
      <h2>Vos droits</h2>
      <p>Accès, rectification, effacement, limitation, opposition et portabilité : écrivez à {store.email}. Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).</p>
    </LegalPage>
  );
}
