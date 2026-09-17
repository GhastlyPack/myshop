import { ImageResponse } from "next/og";
import { Awning, BRAND } from "@/lib/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon: white awning on a brand-orange rounded square. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.orange, borderRadius: 14 }}>
        <Awning width={36} color={BRAND.white} />
      </div>
    ),
    size,
  );
}
