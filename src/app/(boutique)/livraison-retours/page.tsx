import type { Metadata } from "next";
import { LegalPage } from "@/components/shop/LegalPage";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/money";

export const metadata: Metadata = { title: "Livraison et retours", alternates: { canonical: "/livraison-retours" } };

export default async function Page() {
  const { shipping, store } = await getSettings();
  return (
    <LegalPage title="Livraison et retours">
      <h2>Livraison</h2>
      <p>{shipping.methodName} : {formatPrice(shipping.flatRateCents)}{shipping.freeThresholdCents !== null && `, offerte dès ${formatPrice(shipping.freeThresholdCents)}`}.</p>
      <p>{shipping.delayText}</p>
      <p>{shipping.preorderText}</p>
      <h2>Retours</h2>
      <p>Vous disposez de 14 jours après réception pour nous retourner un article. Contactez-nous à {store.email} en indiquant votre numéro de commande ; nous vous indiquerons la marche à suivre. Les articles doivent être retournés non portés, dans leur état d&apos;origine.</p>
      <h2>Remboursement</h2>
      <p>Le remboursement est effectué sur le moyen de paiement utilisé, au plus tard 14 jours après réception de votre demande de rétractation (sous réserve de réception du colis).</p>
    </LegalPage>
  );
}
