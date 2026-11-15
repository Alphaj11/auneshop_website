/** Vitrine statique : pas de compte, donc pas de favoris. */
export async function toggleWishlist(productId: string): Promise<{ ok: boolean; inWishlist?: boolean; error?: string }> {
  void productId;
  return { ok: false, error: "Version de démonstration — les favoris seront disponibles sur la boutique." };
}
