"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setStorePublished } from "@/app/app/settings/actions";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ga } from "@/lib/ga";

export function StorePublishToggle({ published: initial, username }: { published: boolean; username: string }) {
  const router = useRouter();
  const [published, setPublished] = useState(initial);
  const [pending, start] = useTransition();

  function toggle(next: boolean) {
    setPublished(next);
    start(async () => {
      const res = await setStorePublished(next);
      if (!res.ok) {
        setPublished(!next);
        if (res.code === "card_required") {
          toast.info("Add a card to start your free trial, then your store goes live.");
          // Full-page navigation: this route 303-redirects to Stripe Checkout (external), so router.push can't follow it.
          // `then=publish` tells the webhook to take the draft live once the trial starts.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/api/billing/checkout?plan=basic&interval=month&then=publish";
          return;
        }
        toast.error(res.error);
        return;
      }
      ga(next ? "store_published" : "store_unpublished");
      toast.success(next ? "Your store is live." : "Store unpublished. Visitors see a not-found page.");
      router.refresh();
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border bg-background p-4 sm:p-5">
      <div>
        <Label htmlFor="store-published">Store is {published ? "live" : "unpublished"}</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          {published ? `visitmy.shop/${username} is public. Turn this off to take everything down without deleting it.` : "Nobody can see your store or products until you turn this back on."}
        </p>
      </div>
      <Switch id="store-published" checked={published} disabled={pending} onCheckedChange={toggle} />
    </div>
  );
}
