import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth/auth0";

/**
 * Next 16 proxy (formerly middleware).
 * 1. Canonical host: any `www.` host redirects to the apex so cookies (Auth0
 *    transaction, buyer session) always live on one origin.
 * 2. Mount Auth0's /auth/* routes and refresh sessions when Auth0 is configured.
 * Page-level auth lives in lib/auth.
 */
export async function proxy(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  if (host.startsWith("www.")) {
    url.host = host.slice(4);
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }
  if (auth0) return auth0.middleware(request);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/dev/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|xml)$).*)"],
};
