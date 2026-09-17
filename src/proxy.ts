import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth/auth0";

/**
 * Next 16 proxy (formerly middleware). Only job today: mount Auth0's /auth/* routes
 * and refresh sessions when Auth0 is configured. Page-level auth lives in lib/auth.
 */
export async function proxy(request: Request) {
  if (auth0) return auth0.middleware(request);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/dev/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|xml)$).*)"],
};
