import { NextResponse } from "next/server";
import { devSignOut } from "@/lib/auth";
import { auth0Configured, env, isProd } from "@/lib/env";

export async function GET() {
  if (!isProd && !auth0Configured) await devSignOut();
  return NextResponse.redirect(new URL("/", env.APP_BASE_URL));
}
