import { ImageResponse } from "next/og";
import { env } from "@/lib/env";
import { Awning, BRAND, OG_SIZE, ogFonts } from "@/lib/og";
import { getPublicProduct } from "@/lib/queries";
import { publicUrl } from "@/lib/storage";

export const alt = "Product on visitmy.shop";
export const size = OG_SIZE;
export const contentType = "image/png";

function absolute(url: string | null) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${env.APP_BASE_URL}${url}`;
}

function price(cents: number, currency: string) {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}

/** Per-product share card: thumbnail/banner on the right, title, price, and creator on the left. */
export default async function ProductOG({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params;
  const data = await getPublicProduct(username, slug);
  const fonts = await ogFonts();
  const p = data?.product;
  const store = data?.store;
  const image = absolute(publicUrl(p?.thumbnailKey ?? p?.bannerKey ?? null));
  const title = p?.title ?? "visitmy.shop";
  const subtitle = p?.subtitle ?? "";
  const tag = p ? price(p.priceCents, p.currency) : "";

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", background: BRAND.tint, fontFamily: "Inter", color: BRAND.ink }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, width: image ? 720 : 1200 }}>
          <div style={{ display: "flex" }}>
            {tag && <div style={{ display: "flex", background: p?.priceCents === 0 ? BRAND.ink : BRAND.orange, color: BRAND.white, fontSize: 22, fontWeight: 600, padding: "10px 20px", borderRadius: 999 }}>{tag}</div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: image ? 54 : 64, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1.05 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 24, fontWeight: 400, color: BRAND.muted, lineHeight: 1.35 }}>{subtitle}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 20, fontWeight: 600, color: BRAND.muted }}>
            <Awning width={26} />
            <span>{store ? `${store.displayName} · visitmy.shop/${store.username}` : "visitmy.shop"}</span>
          </div>
        </div>
        {image && (
          <div style={{ display: "flex", width: 480, height: 630, overflow: "hidden" }}>
            <img src={image} alt="" width={480} height={630} style={{ width: 480, height: 630, objectFit: "cover" }} />
          </div>
        )}
      </div>
    ),
    { ...size, fonts },
  );
}
