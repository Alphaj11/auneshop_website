import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth/guards";

export const metadata = { robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const links = [
    ["/compte", "Mon compte"],
    ["/compte/commandes", "Commandes"],
    ["/compte/adresses", "Adresses"],
    ["/compte/favoris", "Favoris"],
  ];
  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-28 md:px-10 md:pt-36">
      <p className="eyebrow">Espace client</p>
      <h1 className="display-lg mt-3">Bonjour {user.firstName || ""}</h1>
      <div className="mt-12 grid gap-12 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Espace client" className="flex gap-4 overflow-x-auto text-sm lg:flex-col lg:gap-3">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="link-underline w-fit whitespace-nowrap">
              {label}
            </Link>
          ))}
          <form action={logout}>
            <button className="link-underline whitespace-nowrap text-ink-soft">Se déconnecter</button>
          </form>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
