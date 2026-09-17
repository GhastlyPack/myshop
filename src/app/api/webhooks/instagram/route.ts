import { NextResponse } from "next/server";
import { env, instagramConfigured } from "@/lib/env";
import { handleWebhook, verifySignature, type WebhookBody } from "@/lib/instagram";

export const dynamic = "force-dynamic";

/** Meta's subscription handshake. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const mode = u.searchParams.get("hub.mode");
  const token = u.searchParams.get("hub.verify_token");
  const challenge = u.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN && token === env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("forbidden", { status: 403 });
}

/** Comment and message events. Always 200 fast; Meta retries on non-2xx. */
export async function POST(req: Request) {
  if (!instagramConfigured) return NextResponse.json({ ok: false, reason: "not configured" }, { status: 503 });
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) return new NextResponse("bad signature", { status: 401 });
  let body: WebhookBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }
  if (body.object !== "instagram") return NextResponse.json({ ok: true, ignored: true });
  const r = await handleWebhook(body).catch((e) => {
    console.error("[instagram webhook]", e);
    return { handled: 0 };
  });
  return NextResponse.json({ ok: true, ...r });
}
