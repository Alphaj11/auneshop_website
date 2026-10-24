import "server-only";
import Stripe from "stripe";
import { appUrl } from "@/lib/email";
import { orderAccessToken } from "@/lib/order-token";

let client: Stripe | null = null;

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY manquant");
  client ??= new Stripe(key, { appInfo: { name: "Auneshop" } });
  return client;
}

type OrderForCheckout = {
  id: string;
  number: string;
  email: string;
  shippingCents: number;
  discountCents: number;
  shippingMethod: string;
  items: { productName: string; variantLabel: string; unitPriceCents: number; quantity: number }[];
};

/** Crée une session Stripe Checkout. Les montants viennent de la commande enregistrée en base. */
export async function createCheckoutSession(order: OrderForCheckout) {
  const s = stripe();
  const token = orderAccessToken(order.id);
  let coupon: string | undefined;
  if (order.discountCents > 0) {
    const c = await s.coupons.create({ amount_off: order.discountCents, currency: "eur", duration: "once", max_redemptions: 1, name: `Réduction ${order.number}` });
    coupon = c.id;
  }
  return s.checkout.sessions.create({
    mode: "payment",
    locale: "fr",
    currency: "eur",
    customer_email: order.email,
    client_reference_id: order.id,
    metadata: { orderId: order.id, orderNumber: order.number },
    payment_intent_data: { metadata: { orderId: order.id, orderNumber: order.number } },
    line_items: order.items.map((i) => ({
      quantity: i.quantity,
      price_data: { currency: "eur", unit_amount: i.unitPriceCents, product_data: { name: i.productName, description: i.variantLabel } },
    })),
    discounts: coupon ? [{ coupon }] : undefined,
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: order.shippingMethod,
          fixed_amount: { amount: order.shippingCents, currency: "eur" },
        },
      },
    ],
    // La session expire au bout de 30 minutes : le stock réservé est alors restitué (webhook).
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    success_url: appUrl(`/commande/confirmation/${order.id}?t=${token}`),
    cancel_url: appUrl(`/commande/annulee/${order.id}?t=${token}`),
  });
}
