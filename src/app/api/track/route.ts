import { NextResponse } from "next/server";
import { z } from "zod";
import { track } from "@/lib/track";

/**
 * Client beacon for storefront analytics. Only browser-originated event types
 * are accepted here; lead/purchase/download are recorded server-side.
 */
const short = z.string().trim().max(100);
const bodySchema = z.object({
  storeId: z.string().min(1).max(64),
  productId: z.string().min(1).max(64).optional().nullable(),
  type: z.enum(["view", "product_view", "click", "checkout_start"]),
  sessionId: z.string().min(1).max(64).optional().nullable(),
  source: z
    .object({
      utm_source: short.optional(),
      utm_medium: short.optional(),
      utm_campaign: short.optional(),
      src: short.optional(),
      referrer: short.optional(),
    })
    .partial()
    .optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { storeId, productId, type, sessionId, source } = parsed.data;
  await track({ storeId, productId: productId ?? null, type, sessionId: sessionId ?? null, source: source ?? {} });
  return NextResponse.json({ ok: true });
}
