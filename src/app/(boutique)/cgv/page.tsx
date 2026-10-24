import type { Metadata } from "next";
import { LegalPage } from "@/components/shop/LegalPage";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/money";

export const metadata: Metadata = { title: "Conditions générales de vente", alternates: { canonical: "/cgv" } };

export default async function Page() {
  const { store, legal, shipping } = await getSettings();
  return (
    <LegalPage title="Conditions générales de vente">
      <h2>1. Objet</h2>
      <p>Les présentes conditions régissent les ventes conclues sur le site {store.name} entre {legal.companyName || "le vendeur"} et toute personne physique agissant en qualité de consommateur.</p>
      <h2>2. Produits</h2>
      <p>Les caractéristiques essentielles des produits (matières, tailles, entretien) sont présentées sur chaque fiche. Certaines pièces sont fabriquées à la commande : le délai est alors indiqué avant la commande. {shipping.preorderText}</p>
      <h2>3. Prix</h2>
      <p>Les prix sont indiqués en euros toutes taxes comprises (TVA française incluse), hors frais de livraison. Les frais de livraison sont indiqués avant la validation de la commande ({formatPrice(shipping.flatRateCents)}{shipping.freeThresholdCents !== null ? `, offerts dès ${formatPrice(shipping.freeThresholdCents)} d'achat` : ""}).</p>
      <h2>4. Commande</h2>
      <p>La commande est conclue après acceptation des présentes conditions et clic sur le bouton « Commander avec obligation de paiement ». Un email de confirmation récapitule la commande.</p>
      <h2>5. Paiement</h2>
      <p>Le paiement est réalisé par carte bancaire via un prestataire sécurisé (Stripe). Les données bancaires ne sont jamais stockées par {store.name}. La commande est validée après confirmation du paiement par le prestataire.</p>
      <h2>6. Livraison</h2>
      <p>{shipping.delayText} Livraison dans les pays suivants : {shipping.countries.join(", ")}.</p>
      <h2>7. Droit de rétractation</h2>
      <p>Vous disposez d&apos;un délai de 14 jours à compter de la réception pour exercer votre droit de rétractation, sans avoir à motiver votre décision (article L.221-18 du Code de la consommation), en nous contactant à {store.email}. Les frais de retour sont à votre charge sauf mention contraire. Le remboursement intervient dans les 14 jours suivant la réception de votre demande, sous réserve du retour des produits. <strong>À vérifier :</strong> les pièces confectionnées selon les spécifications du client ou nettement personnalisées peuvent être exclues du droit de rétractation (article L.221-28) ; une pièce standard fabriquée à la commande ne l&apos;est généralement pas.</p>
      <h2>8. Garanties légales</h2>
      <p>Les produits bénéficient de la garantie légale de conformité (articles L.217-3 et suivants du Code de la consommation) et de la garantie des vices cachés (articles 1641 et suivants du Code civil).</p>
      <h2>9. Données personnelles</h2>
      <p>Voir la politique de confidentialité.</p>
      <h2>10. Litiges</h2>
      <p>Les présentes conditions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée avant toute action ; vous pouvez recourir au médiateur de la consommation indiqué dans les mentions légales.</p>
    </LegalPage>
  );
}
