"use client";

import { ImageUpload } from "@/components/app/image-upload";
import type { TabProps } from "./editor";

/** Thumbnail + banner, kept compact beside the preview so the Details tab stays one column. */
export function MediaPanel({ update, errors, thumbnailUrl, bannerUrl }: Pick<TabProps, "update" | "errors"> & { thumbnailUrl: string | null; bannerUrl: string | null }) {
  return (
    <div className="space-y-4 rounded-xl border bg-background p-4">
      <ImageUpload scope="thumb" shape="square" label="Thumbnail" hint="Square, at least 400 x 400." initialUrl={thumbnailUrl} onChange={(key) => update({ thumbnailKey: key })} />
      {errors.thumbnailKey && <p className="text-xs text-destructive">{errors.thumbnailKey}</p>}
      <ImageUpload scope="banner" shape="wide" label="Banner" hint="Wide, top of the product page." initialUrl={bannerUrl} onChange={(key) => update({ bannerKey: key })} />
      {errors.bannerKey && <p className="text-xs text-destructive">{errors.bannerKey}</p>}
    </div>
  );
}
