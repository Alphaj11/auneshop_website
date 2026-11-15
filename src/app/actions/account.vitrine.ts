import type { FormState } from "./auth";

/** Vitrine statique : pas de compte ; le formulaire de contact renvoie vers l'adresse email. */

const notice = async (_: FormState, form: FormData): Promise<FormState> => {
  void form;
  return { error: "Version de démonstration — les comptes seront disponibles sur la boutique." };
};

export const updateProfile = notice;
export const saveAddress = notice;
export const deleteAccount = notice;
export async function deleteAddress(id: string) {
  void id;
}
export async function sendInquiry(_: FormState, form: FormData): Promise<FormState> {
  void form;
  return { error: "Version de démonstration — écrivez-nous directement à l'adresse indiquée sur cette page." };
}
