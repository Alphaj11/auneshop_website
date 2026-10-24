import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartView } from "@/lib/cart";
import { currentPaymentMode } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Commande", robots: { index: false } };

export default async function CheckoutPage() {
  const [cart, user, settings] = await Promise.all([getCartView(), getCurrentUser(), getSettings()]);
  if (!cart.lines.length)
    return (
      <div className="mx-auto max-w-xl px-5 pb-10 pt-40 text-center">
        <h1 className="display-lg">Votre panier est vide</h1>
        <Link href="/collections" className="btn btn-primary mt-8">Découvrir les collections</Link>
      </div>
    );
  const addresses = user ? await db.query.addresses.findMany({ where: eq(schema.addresses.userId, user.id), orderBy: [asc(schema.addresses.createdAt)] }) : [];
  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-28 md:px-10 md:pt-36">
      <h1 className="display-lg">Commande</h1>
      {!user && (
        <p className="mt-4 text-sm text-ink-soft">
          Vous commandez en tant qu&apos;invité.{" "}
          <Link href="/connexion?suivant=/commande" className="link-underline text-ink">Se connecter</Link> pour retrouver vos adresses.
        </p>
      )}
      <CheckoutForm
        cart={cart}
        user={user ? { email: user.email, firstName: user.firstName, lastName: user.lastName } : null}
        addresses={addresses}
        countries={settings.shipping.countries}
        shippingMethod={settings.shipping.methodName}
        delayText={settings.shipping.delayText}
        paymentMode={currentPaymentMode()}
        notice={settings.payment.checkoutNotice}
        storeName={settings.store.name}
      />
    </div>
  );
}
