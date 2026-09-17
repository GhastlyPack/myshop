import { MetaPixel } from "@/components/meta-pixel";
import { env } from "@/lib/env";
import "@/components/storefront/storefront.css";

/** Public storefront shell: pixel + storefront stylesheet. Theme is applied per page (it can be previewed). */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MetaPixel pixelId={env.META_PIXEL_ID} />
      {children}
    </>
  );
}
