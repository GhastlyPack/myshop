import { ImageResponse } from "next/og";
import { env } from "@/lib/env";
import { Awning, BRAND, OG_SIZE, ogFonts } from "@/lib/og";
import { getPublicStoreTagged } from "@/lib/queries";
import { publicUrl } from "@/lib/storage";

export const alt = "Creator store on visitmy.shop";
export const size = OG_SIZE;
export const contentType = "image/png";

function absolute(url: string | null) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${env.APP_BASE_URL}${url}`;
}

/** Per-creator share card: avatar, name, handle, product count, and the store link badge. */
export default async function StoreOG({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const data = await getPublicStoreTagged(username);
  const fonts = await ogFonts();
  const store = data?.store;
  const avatar = absolute(publicUrl(store?.avatarKey));
  const name = store?.displayName ?? "visitmy.shop";
  const handle = store ? `@${store.username}` : "";
  const count = data?.products.length ?? 0;
  const free = data?.products.filter((p) => p.priceCents === 0).length ?? 0;
  const meta = [handle, count ? `${count} product${count === 1 ? "" : "s"}` : null, free ? `${free} free` : null].filter(Boolean).join(" · ");
  const initial = name.trim().charAt(0).toUpperCase() || "V";

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", background: BRAND.tint, fontFamily: "Inter", color: BRAND.ink }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, width: 800 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 20, fontWeight: 600, color: BRAND.muted }}>
            <Awning width={26} />
            <span>visitmy.shop</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 68, letterSpacing: -2.5, lineHeight: 1.02, maxWidth: 640 }}>{name}</div>
            {store?.bio && <div style={{ fontSize: 26, color: BRAND.muted, lineHeight: 1.4, maxWidth: 620 }}>{store.bio.slice(0, 120)}</div>}
            {meta && <div style={{ fontSize: 22, fontWeight: 600, color: BRAND.muted }}>{meta}</div>}
          </div>
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", alignItems: "center", background: BRAND.orange, color: BRAND.white, padding: "14px 28px", borderRadius: 999, fontSize: 22, fontWeight: 600 }}>visitmy.shop/{store?.username ?? ""}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 400, height: 630 }}>
          {avatar ? (
            <img src={avatar} width={280} height={280} alt="" style={{ width: 280, height: 280, borderRadius: 280, objectFit: "cover", border: `8px solid ${BRAND.white}` }} />
          ) : (
            <div style={{ width: 280, height: 280, borderRadius: 280, background: BRAND.orange, color: BRAND.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 120, fontWeight: 600 }}>{initial}</div>
          )}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
