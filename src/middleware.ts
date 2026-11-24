import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, getAdminConfig, verifySessionToken } from "@/lib/admin-session";

/** Protege todas as rotas /admin (exceto a tela de login). */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const { secret, enabled } = getAdminConfig();
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const ok = enabled && (await verifySessionToken(token, secret));
  if (ok) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = pathname !== "/admin" ? `?next=${encodeURIComponent(pathname)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
