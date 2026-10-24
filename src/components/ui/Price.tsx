import { formatPrice } from "@/lib/money";

export function Price({ cents, compareAt, className = "" }: { cents: number; compareAt?: number | null; className?: string }) {
  const onSale = compareAt != null && compareAt > cents;
  return (
    <span className={`tabular-nums ${className}`}>
      {onSale && (
        <>
          <span className="sr-only">Prix réduit :</span>
          <span className="mr-2 text-terre-ink">{formatPrice(cents)}</span>
          <span className="sr-only">au lieu de</span>
          <s className="text-ink-mute">{formatPrice(compareAt)}</s>
        </>
      )}
      {!onSale && formatPrice(cents)}
    </span>
  );
}
