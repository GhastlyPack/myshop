import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { metaConfigured, sendCapiEvent } from "@/lib/meta";

export const dynamic = "force-dynamic";

/**
 * GET /api/meta/test?code=TESTXXXX  (admin only)
 * Sends a PageView through the Conversions API and returns Meta's raw response so
 * the pixel id + CAPI token can be verified in Events Manager -> Test events.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return Response.json({ error: "admin only" }, { status: 401 });

  const url = new URL(request.url);
  const h = await headers();
  const eventId = `test-${Date.now()}`;
  const result = await sendCapiEvent({
    eventName: "PageView",
    eventId,
    eventSourceUrl: `${env.APP_BASE_URL}/api/meta/test`,
    email: user.email,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent"),
    testEventCode: url.searchParams.get("code") ?? undefined,
    customData: { source: "visitmy.shop admin test" },
  });

  return Response.json({ configured: metaConfigured, pixelId: env.META_PIXEL_ID ?? null, eventId, result });
}
