import type { Metadata } from "next";
import { InquiryForm } from "@/components/account/AccountForms";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default async function Page() {
  const [{ store }, user] = await Promise.all([getSettings(), getCurrentUser()]);
  return (
    <div className="mx-auto grid max-w-[1400px] gap-16 px-5 pb-10 pt-32 md:px-10 md:pt-40 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <h1 className="display-lg">Écrire à l&apos;atelier</h1>
        <p className="mt-6 text-ink-soft">Une question sur une pièce, une taille, une commande ? Nous répondons sous 48 h ouvrées.</p>
        <p className="mt-8 text-sm">{store.email}<br />{store.phone}<br />{store.address}</p>
      </div>
      <InquiryForm name={user ? `${user.firstName} ${user.lastName}`.trim() : undefined} email={user?.email} />
    </div>
  );
}
