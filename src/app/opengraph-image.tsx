import { ImageResponse } from "next/og";
import { BRAND, OG_SIZE, WordmarkOG, ogFonts } from "@/lib/og";

export const alt = "visitmy.shop — your bio link, but it actually sells.";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Site-wide share card (lander, /me, anything without its own). */
export default async function OG() {
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: BRAND.tint, fontFamily: "Inter" }}>
        <WordmarkOG size={86} />
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 60, fontWeight: 600, letterSpacing: -1.5, color: BRAND.ink, lineHeight: 1.05, maxWidth: 1040 }}>Your bio link, but it actually sells.</div>
          <div style={{ fontSize: 26, fontWeight: 400, color: BRAND.muted, lineHeight: 1.4, maxWidth: 1000 }}>Upload a digital product. Drop one link in your Instagram bio. Get paid to your own Stripe.</div>
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", alignItems: "center", background: BRAND.orange, color: BRAND.white, fontSize: 22, fontWeight: 600, padding: "14px 34px", borderRadius: 999 }}>visitmy.shop/you</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
