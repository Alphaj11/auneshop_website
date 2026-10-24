import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/account/AuthShell";
import { RegisterForm } from "@/components/account/AuthForms";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ suivant?: string }> }) {
  const { suivant } = await searchParams;
  return (
    <AuthShell
      title="Créer un compte"
      aside={
        <p className="text-sm">
          Déjà un compte ? <Link href="/connexion" className="link-underline font-medium">Se connecter</Link>
        </p>
      }
    >
      <RegisterForm next={suivant} />
    </AuthShell>
  );
}
