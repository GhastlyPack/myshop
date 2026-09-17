import { NextResponse } from "next/server";
import { isProd } from "@/lib/env";
import { revalidateStore } from "@/lib/queries";

// Dev-only: drop the cached storefront for a store after out-of-band changes (e.g. scripts/import-products.ts).
export async function POST(req: Request) {
  if (isProd) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const store = new URL(req.url).searchParams.get("store");
  if (!store) return NextResponse.json({ error: "missing store" }, { status: 400 });
  revalidateStore(store);
  return NextResponse.json({ ok: true, store });
}
