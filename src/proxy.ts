import { NextResponse, type NextRequest } from "next/server";

/**
 * Filtre optimiste : sans cookie de session, on redirige tout de suite vers la
 * connexion. Ce n'est PAS la sécurité : chaque page et chaque action
 * d'administration revérifie la session et les permissions côté serveur.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/connexion") && !req.cookies.get("aune_session")) {
    return NextResponse.redirect(new URL("/admin/connexion", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
