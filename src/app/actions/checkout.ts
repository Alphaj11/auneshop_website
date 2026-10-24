"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { readCartId } from "@/lib/cart";
import { orderAccessToken } from "@/lib/order-token";
import { CheckoutError, createOrderFromCart, currentPaymentMode, demoCheckoutAllowed, expireStaleOrders, failOrderPayment } from "@/lib/orders";
import { createCheckoutSession } from "@/lib/payments/stripe";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import type { FormState } from "./auth";

const input = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide.").max(200),
  firstName: z.string().trim().min(1, "Prénom requis.").max(80),
  lastName: z.string().trim().min(1, "Nom requis.").max(80),
  line1: z.string().trim().min(3, "Adresse requise.").max(200),
  line2: z.string().trim().max(200).optional(),
  postalCode: z.string().trim().regex(/^[0-9A-Za-z -]{3,10}$/, "Code postal invalide."),
  city: z.string().trim().min(1, "Ville requise.").max(100),
  country: z.string().trim().length(2).toUpperCase(),
  phone: z.string().trim().max(30).optional(),
  note: z.string().trim().max(1000).optional(),
  terms: z.literal("on", { message: "Vous devez accepter les conditions générales de vente." }),
  saveAddress: z.string().optional(),
});

export async function placeOrder(_: FormState, form: FormData): Promise<FormState> {
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] ??= i.message;
    return { fieldErrors: fe, error: "Vérifiez les champs signalés." };
  }
  if (currentPaymentMode() === "demo" && !demoCheckoutAllowed())
    return { error: "Le paiement en ligne n'est pas encore ouvert. Revenez très bientôt." };
  if (!(await rateLimit("checkout", 15, 600))) return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  const settings = await getSettings();
  if (!settings.shipping.countries.includes(parsed.data.country)) return { fieldErrors: { country: "Nous ne livrons pas encore ce pays." } };

  const cartId = await readCartId();
  if (!cartId) return { error: "Votre panier est vide." };
  await expireStaleOrders().catch(() => 0);
  const user = await getCurrentUser();
  const d = parsed.data;
  const address = { firstName: d.firstName, lastName: d.lastName, line1: d.line1, line2: d.line2 || null, postalCode: d.postalCode, city: d.city, country: d.country, phone: d.phone || null };

  let orderId: string;
  try {
    const { order } = await createOrderFromCart({ cartId, userId: user?.id ?? null, email: d.email, shippingAddress: address, customerNote: d.note });
    orderId = order.id;
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.message };
    console.error("[checkout]", e);
    return { error: "La commande n'a pas pu être créée. Réessayez." };
  }

  if (user && d.saveAddress === "on") {
    const count = await db.$count(schema.addresses, eq(schema.addresses.userId, user.id));
    if (count < 10) await db.insert(schema.addresses).values({ ...address, userId: user.id, isDefault: count === 0 });
  }

  const token = orderAccessToken(orderId);
  const mode = currentPaymentMode();
  if (mode === "demo") redirect(`/commande/paiement-demo/${orderId}?t=${token}`);

  // Paiement Stripe : on crée la session à partir des montants enregistrés.
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), with: { items: true } });
  let url: string | null = null;
  try {
    const session = await createCheckoutSession(order!);
    await db.insert(schema.payments).values({ orderId, provider: "stripe", providerRef: session.id, status: "pending", amountCents: order!.totalCents, livemode: session.livemode });
    url = session.url;
  } catch (e) {
    console.error("[stripe] création de session impossible", e);
    await failOrderPayment(orderId, "Impossible d'ouvrir la page de paiement.", "failed");
    return { error: "Le service de paiement est indisponible. Votre panier est conservé, réessayez dans un instant." };
  }
  redirect(url!);
}
