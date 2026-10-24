import { Logo } from "@/components/ui/Logo";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/account/AuthForms";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/permissions";

export const metadata = { title: "Connexion" };

export default async function AdminLogin() {
  const user = await getCurrentUser();
  if (user && isStaff(user.role)) redirect("/admin");
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink px-5">
      <div className="w-full max-w-sm rounded-lg bg-paper p-8">
        <Logo className="h-9 w-auto" alt="Aune" />
        <h1 className="mt-6 text-lg">Administration</h1>
        <p className="mb-6 mt-1 text-sm text-ink-soft">Accès réservé à l&apos;équipe.</p>
        <LoginForm area="admin" />
      </div>
    </div>
  );
}
