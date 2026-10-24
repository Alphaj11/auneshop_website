import type { Metadata } from "next";
import { LegalPage } from "@/components/shop/LegalPage";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };

export default async function Page() {
  const { store, legal } = await getSettings();
  const v = (x: string) => x || <em>[à compléter dans Réglages › Informations légales]</em>;
  return (
    <LegalPage title="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        <strong>{v(legal.companyName)}</strong> {legal.legalForm && `(${legal.legalForm})`}<br />
        Adresse : {v(store.address)}<br />
        SIRET : {v(legal.siret)} · TVA intracommunautaire : {v(legal.vatNumber)}<br />
        Contact : {store.email} {store.phone && `· ${store.phone}`}<br />
        Directeur ou directrice de la publication : {v(legal.publisher)}
      </p>
      <h2>Hébergement</h2>
      <p>{v(legal.host)}</p>
      <h2>Propriété intellectuelle</h2>
      <p>L&apos;ensemble des contenus du site (textes, photographies, illustrations, logo) est protégé. Toute reproduction sans autorisation est interdite.</p>
      <h2>Médiation de la consommation</h2>
      <p>Conformément aux articles L.612-1 et suivants du Code de la consommation, vous pouvez recourir gratuitement au médiateur suivant : {v(legal.mediator)}. Plateforme européenne de règlement en ligne des litiges : https://ec.europa.eu/consumers/odr.</p>
    </LegalPage>
  );
}
