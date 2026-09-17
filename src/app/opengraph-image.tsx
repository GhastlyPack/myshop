import { ImageResponse } from "next/og";
import { BRAND, OG_SIZE, WordmarkOG, landingImage, ogFonts } from "@/lib/og";

export const alt = "visitmy.shop — your bio link, but it actually sells.";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Site-wide share card: headline on the left, a small storefront mockup on the right. */
export default async function OG() {
  const [fonts, avatar, banner] = await Promise.all([ogFonts(), landingImage("creator.jpg"), landingImage("reels-pack.jpg")]);
  const card = { display: "flex", background: BRAND.white, borderRadius: 18, border: `1px solid ${BRAND.border}`, overflow: "hidden" } as const;
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", background: BRAND.tint, fontFamily: "Inter", color: BRAND.ink }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 0 72px 80px", width: 760 }}>
          <WordmarkOG size={44} />
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", fontFamily: "Manrope", fontWeight: 800, fontSize: 72, letterSpacing: -2.5, lineHeight: 1.02 }}>
              <span>Your bio link,</span>
              <span>
                but it <span style={{ color: BRAND.orange, marginLeft: 16 }}>actually sells.</span>
              </span>
            </div>
            <div style={{ fontSize: 26, color: BRAND.muted, lineHeight: 1.4, maxWidth: 600 }}>Upload a digital product. Drop one link in your bio. Get paid to your own Stripe.</div>
          </div>
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", alignItems: "center", background: BRAND.orange, color: BRAND.white, fontSize: 22, fontWeight: 600, padding: "14px 30px", borderRadius: 999 }}>visitmy.shop/you</div>
          </div>
        </div>

        {/* phone */}
        <div style={{ display: "flex", position: "absolute", right: 80, top: 62, width: 300, height: 640, background: "#0f0f10", borderRadius: 46, padding: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 280, height: 620, background: BRAND.tint, borderRadius: 36, padding: "54px 16px 0" }}>
            <img src={avatar} width={64} height={64} alt="" style={{ width: 64, height: 64, borderRadius: 64, objectFit: "cover" }} />
            <div style={{ display: "flex", fontSize: 17, fontWeight: 600, marginTop: 10 }}>Maya Ortega</div>
            <div style={{ display: "flex", fontSize: 11, color: BRAND.muted, marginTop: 4, textAlign: "center" }}>Content coach. Free checklist below.</div>
            <div style={{ ...card, flexDirection: "column", width: 248, marginTop: 18 }}>
              <img src={banner} width={248} height={124} alt="" style={{ width: 248, height: 124, objectFit: "cover" }} />
              <div style={{ display: "flex", flexDirection: "column", padding: 12, gap: 4 }}>
                <div style={{ display: "flex", fontSize: 13, fontWeight: 600 }}>Reels Template Pack</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>$19</span>
                  <span style={{ display: "flex", background: BRAND.orange, color: BRAND.white, fontSize: 11, fontWeight: 600, padding: "7px 12px", borderRadius: 999 }}>Get the pack</span>
                </div>
              </div>
            </div>
            <div style={{ ...card, width: 248, marginTop: 10, padding: 12, alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Golden Hour Preset</span>
              <span style={{ display: "flex", background: BRAND.orange, color: BRAND.white, fontSize: 11, fontWeight: 600, padding: "7px 12px", borderRadius: 999 }}>$9</span>
            </div>
            <div style={{ ...card, width: 248, marginTop: 10, padding: 12, alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>7-Day Launch Checklist</span>
              <span style={{ display: "flex", background: BRAND.ink, color: BRAND.white, fontSize: 11, fontWeight: 600, padding: "7px 12px", borderRadius: 999 }}>Free</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", position: "absolute", right: 188, top: 74, width: 84, height: 24, borderRadius: 999, background: "#0f0f10" }} />
      </div>
    ),
    { ...size, fonts },
  );
}
