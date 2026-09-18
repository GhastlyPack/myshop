import { StorePixels } from "@/components/storefront/store-pixels";
import { env } from "@/lib/env";
import { resolveStorePixels } from "@/lib/pixels";
import { getPublicStoreTagged } from "@/lib/queries";
import "@/components/storefront/storefront.css";

/** Public storefront shell: the creator's ad pixels (plus the platform's) + storefront stylesheet. */
export default async function StorefrontLayout({ children, params }: { children: React.ReactNode; params: Promise<{ username: string }> }) {
  const { username } = await params;
  const data = await getPublicStoreTagged(username);
  const pixels = resolveStorePixels(data?.store.pixels, env.META_PIXEL_ID);
  return (
    <>
      <StorePixels pixels={pixels} />
      {children}
    </>
  );
}
