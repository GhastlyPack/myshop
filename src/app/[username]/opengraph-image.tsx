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
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: BRAND.ink, fontFamily: "Inter", color: BRAND.white }}>
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {avatar ? (
            <img src={avatar} width={160} height={160} alt="" style={{ width: 160, height: 160, borderRadius: 160, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 160, height: 160, borderRadius: 160, background: BRAND.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, fontWeight: 600 }}>{initial}</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: -2, lineHeight: 1.05, maxWidth: 1040 }}>{name}</div>
          {meta && <div style={{ fontSize: 28, fontWeight: 400, color: "#A1A1AA" }}>{meta}</div>}
        </div>
        <div style={{ display: "flex" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#29292B", padding: "12px 20px 12px 18px", borderRadius: 999, fontSize: 20, fontWeight: 600 }}>
            <Awning width={28} />
            <span>visitmy.shop/{store?.username ?? ""}</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
