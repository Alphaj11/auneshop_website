import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/account/AuthShell";
import { LoginForm } from "@/components/account/AuthForms";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ suivant?: string }> }) {
  const { suivant } = await searchParams;
  if (await getCurrentUser()) redirect(suivant?.startsWith("/") && !suivant.startsWith("//") ? suivant : "/compte");
  return (
    <AuthShell
      title="Connexion"
      subtitle="Retrouvez vos commandes, vos adresses et vos favoris."
      aside={
        <p className="text-sm">
          Pas encore de compte ?{" "}
          <Link href={`/inscription${suivant ? `?suivant=${encodeURIComponent(suivant)}` : ""}`} className="link-underline font-medium">
            Créer un compte
          </Link>
          <br />
          <span className="text-ink-soft">Vous pouvez aussi commander sans compte.</span>
        </p>
      }
    >
      <LoginForm next={suivant} />
    </AuthShell>
  );
}
