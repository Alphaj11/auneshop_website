/**
 * Taille conseillée à partir de la taille (cm) et du poids (kg) : grille INDICATIVE,
 * sans garantie d'ajustement (l'atelier confirme les mesures avant fabrication).
 *
 * Grille femme (XS → 2XL) : poids < 50 / 58 / 66 / 75 / 85 kg, au-delà 2XL.
 * Grille homme (S → 2XL) : poids < 62 / 72 / 82 / 94 kg, au-delà 2XL.
 * Au-delà de 178 cm (femme) ou 188 cm (homme), on monte d'une taille pour la longueur.
 * Tailles chiffrées (34 → 44) : correspondance XS = 34 … 2XL = 44.
 */

const LETTERS = ["XS", "S", "M", "L", "XL", "2XL"];
const NUMBERS = ["34", "36", "38", "40", "42", "44"];

export function recommendSize(heightCm: number, weightKg: number, sizes: string[]): string | null {
  if (!sizes.length) return null;
  const men = !sizes.includes("XS") && sizes.includes("S") && !sizes.some((s) => NUMBERS.includes(s));
  const bands = men ? [62, 72, 82, 94] : [50, 58, 66, 75, 85];
  let i = bands.findIndex((b) => weightKg < b);
  if (i === -1) i = bands.length;
  if (heightCm > (men ? 188 : 178)) i += 1;
  // Grille homme : S est la première taille.
  const letter = LETTERS[Math.min(LETTERS.length - 1, i + (men ? 1 : 0))];
  const wanted = sizes.some((s) => NUMBERS.includes(s)) ? NUMBERS[LETTERS.indexOf(letter)] : letter;
  if (sizes.includes(wanted)) return wanted;
  // Taille absente du modèle : la plus proche disponible.
  const order = sizes.some((s) => NUMBERS.includes(s)) ? NUMBERS : LETTERS;
  const target = order.indexOf(wanted);
  return [...sizes].sort((a, b) => Math.abs(order.indexOf(a) - target) - Math.abs(order.indexOf(b) - target))[0];
}

/** Clé de session : précisions sur-mesure reprises dans la note de commande. */
export const SUR_MESURE_KEY = "aune_sur_mesure";
