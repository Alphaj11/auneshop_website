/**
 * Calculs monétaires en centimes entiers. Aucun flottant n'est stocké.
 */

const formatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function formatPrice(cents: number): string {
  return formatter.format(cents / 100);
}

/** Convertit une saisie "12,90" ou "12.90" en centimes. Retourne null si invalide. */
export function parsePriceToCents(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, "").replace("€", "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [euros, decimals = ""] = normalized.split(".");
  return Number(euros) * 100 + Number(decimals.padEnd(2, "0"));
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Pourcentage arrondi au centime le plus proche (arrondi bancaire non nécessaire ici). */
export function percentOf(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}

/** TVA incluse dans un montant TTC : ttc * taux / (100 + taux). */
export function includedVat(ttcCents: number, ratePercent: number): number {
  return Math.round((ttcCents * ratePercent) / (100 + ratePercent));
}
