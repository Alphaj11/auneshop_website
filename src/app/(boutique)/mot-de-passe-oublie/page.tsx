import type { Metadata } from "next";
import { AuthShell } from "@/components/account/AuthShell";
import { ForgotForm } from "@/components/account/AuthForms";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthShell title="Mot de passe oublié" subtitle="Indiquez votre email : nous vous envoyons un lien pour choisir un nouveau mot de passe.">
      <ForgotForm />
    </AuthShell>
  );
}
