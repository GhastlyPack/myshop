import { ImageResponse } from "next/og";
import { BRAND, WordmarkOG, ogFonts } from "@/lib/og";

export const dynamic = "force-dynamic"; // reads ?theme; the CDN caches each URL via Cache-Control

/**
 * PNG wordmark for places that can't run our fonts: emails, third-party embeds.
 * 2x for retina. `?theme=dark` renders white text for dark backgrounds.
 *   /brand/wordmark            → 560×112, ink text, orange mark, transparent
 *   /brand/wordmark?theme=dark → white text
 */
export async function GET(req: Request) {
  const dark = new URL(req.url).searchParams.get("theme") === "dark";
  const res = new ImageResponse(
    (
      <div style={{ width: 560, height: 112, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent" }}>
        <WordmarkOG size={88} color={dark ? BRAND.white : BRAND.ink} />
      </div>
    ),
    { width: 560, height: 112, fonts: await ogFonts(), headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
  return res;
}
