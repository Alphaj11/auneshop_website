export const orderStatusLabels: Record<string, string> = {
  pending_payment: "En attente de paiement",
  paid: "Payée",
  processing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};

export const paymentStatusLabels: Record<string, string> = {
  pending: "En attente",
  paid: "Payé",
  failed: "Échoué",
  cancelled: "Annulé",
  refunded: "Remboursé",
  partially_refunded: "Partiellement remboursé",
};

export const paymentModeLabels: Record<string, string> = {
  demo: "Démonstration (aucun paiement réel)",
  stripe_test: "Stripe — mode test",
  stripe_live: "Stripe — paiement réel",
};

export const statusTone: Record<string, string> = {
  pending_payment: "bg-vanille/50 text-ink",
  paid: "bg-success/15 text-success",
  processing: "bg-sapin/15 text-sapin",
  shipped: "bg-ink/10 text-ink",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-danger/10 text-danger",
  refunded: "bg-danger/10 text-danger",
  pending: "bg-vanille/50 text-ink",
  failed: "bg-danger/10 text-danger",
  partially_refunded: "bg-vanille/50 text-ink",
};

export function StatusBadge({ status, labels = orderStatusLabels }: { status: string; labels?: Record<string, string> }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${statusTone[status] ?? "bg-paper-2"}`}>{labels[status] ?? status}</span>;
}

export const dateFr = (d: Date | string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));
export const dateTimeFr = (d: Date | string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(d));
