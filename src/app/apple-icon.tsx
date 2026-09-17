import { ImageResponse } from "next/og";
import { Awning, BRAND } from "@/lib/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home-screen icon. iOS applies its own corner mask, so this stays square. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.orange }}>
        <Awning width={100} color={BRAND.white} />
      </div>
    ),
    size,
  );
}
