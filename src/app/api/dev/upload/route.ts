import { NextResponse } from "next/server";
import { isProd, s3Configured } from "@/lib/env";
import { localPut } from "@/lib/storage";

// Dev-only stand-in for a presigned S3 PUT. The ticket token is minted by createUploadTicket().
export async function PUT(req: Request) {
  if (isProd || s3Configured) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const t = new URL(req.url).searchParams.get("t");
  if (!t) return NextResponse.json({ error: "missing ticket" }, { status: 400 });
  try {
    const body = Buffer.from(await req.arrayBuffer());
    const res = await localPut(t, body);
    return NextResponse.json({ ok: true, ...res, bytes: body.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
