import { formatPrice } from "@/lib/money";
import type { AddressSnapshot } from "@/db/schema";

type Order = {
  items: { id: string; productName: string; variantLabel: string; quantity: number; unitPriceCents: number; lineTotalCents: number; imageUrl: string | null }[];
  subtotalCents: number;
  discountCents: number;
  discountCode: string | null;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shippingAddress: AddressSnapshot;
  shippingMethod: string;
  email: string;
};

export function OrderSummary({ order }: { order: Order }) {
  const a = order.shippingAddress;
  return (
    <div className="grid gap-10 md:grid-cols-[1fr_300px]">
      <ul className="divide-y divide-line border-y border-line">
        {order.items.map((i) => (
          <li key={i.id} className="flex items-center gap-4 py-4">
            <div className="h-20 w-16 shrink-0 overflow-hidden rounded bg-paper-2">
              {i.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.imageUrl} alt="" className="h-full w-full object-contain p-1" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-display text-lg">{i.productName}</p>
              <p className="text-sm text-ink-soft">{i.variantLabel} · {i.quantity} × {formatPrice(i.unitPriceCents)}</p>
            </div>
            <p className="tabular-nums">{formatPrice(i.lineTotalCents)}</p>
          </li>
        ))}
      </ul>
      <div className="space-y-6 text-sm">
        <dl className="space-y-2">
          <div className="flex justify-between"><dt>Sous-total</dt><dd className="tabular-nums">{formatPrice(order.subtotalCents)}</dd></div>
          {order.discountCents > 0 && <div className="flex justify-between text-terre-ink"><dt>Réduction {order.discountCode && `(${order.discountCode})`}</dt><dd>−{formatPrice(order.discountCents)}</dd></div>}
          <div className="flex justify-between"><dt>Livraison ({order.shippingMethod})</dt><dd className="tabular-nums">{order.shippingCents ? formatPrice(order.shippingCents) : "Offerte"}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-medium"><dt>Total TTC</dt><dd className="tabular-nums">{formatPrice(order.totalCents)}</dd></div>
          <div className="flex justify-between text-xs text-ink-mute"><dt>Dont TVA</dt><dd>{formatPrice(order.taxCents)}</dd></div>
        </dl>
        <div>
          <p className="eyebrow mb-2 !text-ink">Livraison</p>
          <p className="leading-relaxed text-ink-soft">{a.firstName} {a.lastName}<br />{a.line1}<br />{a.line2 && <>{a.line2}<br /></>}{a.postalCode} {a.city} ({a.country})</p>
        </div>
      </div>
    </div>
  );
}
