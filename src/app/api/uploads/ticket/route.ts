import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentStore } from "@/lib/auth";
import { createUploadTicket, makeKey, MAX_FILE_BYTES, MAX_IMAGE_BYTES } from "@/lib/storage";

/**
 * Creator-only. Returns a ticket the browser uses to PUT bytes directly to storage
 * (S3 presigned URL in prod, /api/dev/upload locally). The caller then records the
 * returned `key` on the product/store via a server action.
 *
 * body: { bucket: "files" | "public", filename, contentType, bytes, scope?: "product" | "avatar" | "thumb" | "banner" | "bg" }
 */
const bodySchema = z.object({
  bucket: z.enum(["files", "public"]),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
  bytes: z.number().int().positive(),
  scope: z.enum(["product", "avatar", "thumb", "banner", "bg"]).default("product"),
});

export async function POST(req: Request) {
  const store = await getCurrentStore();
  if (!store) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { bucket, filename, contentType, bytes, scope } = parsed.data;

  if (bucket === "public") {
    if (!contentType.startsWith("image/")) return NextResponse.json({ error: "images only" }, { status: 400 });
    if (bytes > MAX_IMAGE_BYTES) return NextResponse.json({ error: "image too large (10 MB max)" }, { status: 400 });
  } else if (bytes > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "file too large (5 GB max)" }, { status: 400 });
  }

  const key = makeKey(`${store.id}/${scope}`, filename);
  const ticket = await createUploadTicket(bucket, key, contentType, bytes);
  return NextResponse.json(ticket);
}
