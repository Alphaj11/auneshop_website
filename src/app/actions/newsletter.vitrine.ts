export type NewsletterState = { ok?: boolean; error?: string; fieldErrors?: { email?: string; consent?: string } };

/** Vitrine statique : aucune inscription n'est enregistrée. */
export async function subscribeNewsletter(_: NewsletterState, form: FormData): Promise<NewsletterState> {
  void form;
  return { error: "Version de démonstration — l'inscription sera possible sur la boutique." };
}
