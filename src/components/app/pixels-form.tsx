"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePixels } from "@/app/app/settings/actions";
import type { PixelsFormInput } from "@/lib/pixels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Connect a creator's own Meta / Google / TikTok pixels. They fire on the creator's
 * storefront (PageView, ViewContent, InitiateCheckout, Lead, Purchase) so their ad
 * campaigns optimize and retarget on their traffic. Meta also supports server-side
 * Conversions API via an optional access token.
 */
export function PixelsForm({ initial }: { initial: PixelsFormInput }) {
  const router = useRouter();
  const [metaPixelId, setMetaPixelId] = useState(initial.metaPixelId);
  const [metaCapiToken, setMetaCapiToken] = useState("");
  const [googleTagId, setGoogleTagId] = useState(initial.googleTagId);
  const [tiktokPixelId, setTiktokPixelId] = useState(initial.tiktokPixelId);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await updatePixels({
        metaPixelId: metaPixelId.trim(),
        // Only send a token when the creator typed a new one; blank keeps the saved one.
        metaCapiToken: metaCapiToken.trim() || undefined,
        googleTagId: googleTagId.trim(),
        tiktokPixelId: tiktokPixelId.trim(),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setMetaCapiToken("");
      toast.success("Pixels saved. They fire on your storefront within a minute.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 rounded-xl border bg-background p-4 sm:p-5">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Meta (Facebook &amp; Instagram)</span>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meta-pixel">Pixel ID</Label>
          <Input id="meta-pixel" value={metaPixelId} onChange={(e) => setMetaPixelId(e.target.value)} placeholder="1234567890123456" inputMode="numeric" autoComplete="off" spellCheck={false} />
          <p className="text-xs text-muted-foreground">From Meta Events Manager → Data sources. A 15–16 digit number.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meta-capi">Conversions API token <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input
            id="meta-capi"
            type="password"
            value={metaCapiToken}
            onChange={(e) => setMetaCapiToken(e.target.value)}
            placeholder={initial.metaCapiTokenSet ? "•••••••• saved — leave blank to keep" : "Paste to also send server-side events"}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">Improves match quality for Leads and Purchases. Generate it under your pixel&apos;s settings; it&apos;s stored securely and never shown again.</p>
        </div>
      </div>

      <div className="space-y-1.5 border-t pt-4">
        <Label htmlFor="google-tag">Google tag ID</Label>
        <Input id="google-tag" value={googleTagId} onChange={(e) => setGoogleTagId(e.target.value)} placeholder="G-XXXXXXXXXX or AW-XXXXXXXXX" autoComplete="off" spellCheck={false} />
        <p className="text-xs text-muted-foreground">Your GA4 Measurement ID (G-) or Google Ads tag (AW-). Fires view_item, begin_checkout and purchase.</p>
      </div>

      <div className="space-y-1.5 border-t pt-4">
        <Label htmlFor="tiktok-pixel">TikTok Pixel ID</Label>
        <Input id="tiktok-pixel" value={tiktokPixelId} onChange={(e) => setTiktokPixelId(e.target.value)} placeholder="CXXXXXXXXXXXXXXXXXXX" autoComplete="off" spellCheck={false} />
        <p className="text-xs text-muted-foreground">From TikTok Events Manager. Fires ViewContent, InitiateCheckout and CompletePayment.</p>
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save pixels"}
        </Button>
      </div>
    </div>
  );
}
