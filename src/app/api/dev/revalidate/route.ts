import { NextResponse } from "next/server";
import { env, isProd } from "@/lib/env";
import { revalidateStore } from "@/lib/queries";

/**
 * Drop the cached storefront for a store after out-of-band changes (scripts, direct SQL).
 * Open in dev. In production it needs `Authorization: Bearer $REVALIDATE_SECRET` and is
 * disabled when that secret isn't set.
 */
export async function POST(req: Request) {
  if (isProd) {
    const secret = env.REVALIDATE_SECRET;
    if (!secret) return NextResponse.json({ error: "disabled" }, { status: 404 });
    if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const store = new URL(req.url).searchParams.get("store");
  if (!store) return NextResponse.json({ error: "missing store" }, { status: 400 });
  revalidateStore(store);
  return NextResponse.json({ ok: true, store });
}
