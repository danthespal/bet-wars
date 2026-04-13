import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionFromCookieHeaderEdge } from "@/features/auth/server/session-edge";

function withRedirect(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  if (pathname === "/login") {
    url.searchParams.set("next", req.nextUrl.pathname);
  }

  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const session = await getSessionFromCookieHeaderEdge(req.headers.get("cookie"));
  const requiresUser =
    pathname.startsWith("/play") || pathname.startsWith("/tickets") || pathname.startsWith("/bankroll");
  const requiresAdmin = pathname.startsWith("/admin");
  const authOnly = pathname === "/login" || pathname === "/register";

  if (!session && (requiresUser || requiresAdmin)) {
    return withRedirect(req, "/login");
  }

  if (session && authOnly) {
    return withRedirect(req, session.role === "admin" ? "/admin" : "/play");
  }

  if (requiresAdmin && session?.role !== "admin") {
    return withRedirect(req, "/unauthorized");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
