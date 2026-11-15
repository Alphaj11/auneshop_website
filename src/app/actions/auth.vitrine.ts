/** Vitrine statique : pas de compte client. */

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string | undefined>; message?: string };

const notice = async (_: FormState, form: FormData): Promise<FormState> => {
  void form;
  return { error: "Version de démonstration — les comptes seront disponibles sur la boutique." };
};

export const login = notice;
export const register = notice;
export const requestPasswordReset = notice;
export const resetPassword = notice;
export const changePassword = notice;
export async function logout() {}
