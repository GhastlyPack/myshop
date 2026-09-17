import { NextResponse } from "next/server";
import { consumeMagicLink, mintBuyerCookie } from "@/lib/buyer-session";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Magic-link landing: consume the token, set the buyer cookie, go to /me. */
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  const email = await consumeMagicLink(t);
  if (!email) return NextResponse.redirect(new URL("/me?error=expired", env.APP_BASE_URL));
  const cookie = await mintBuyerCookie(email);
  const res = NextResponse.redirect(new URL("/me", env.APP_BASE_URL));
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
