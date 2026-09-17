"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { disconnectInstagram, setInstagramOptions } from "@/app/app/settings/actions";

export function InstagramControls({ connected, publicReply, active }: { connected: boolean; publicReply: boolean; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!connected) return null;
  const update = (patch: { publicReply?: boolean; active?: boolean }) =>
    start(async () => {
      const r = await setInstagramOptions(patch);
      if (!r.ok) toast.error(r.error);
      else router.refresh();
    });
  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex items-center gap-2">
        <Label htmlFor="ig-active" className="text-xs">
          Replies
        </Label>
        <Switch id="ig-active" checked={active} disabled={pending} onCheckedChange={(v) => update({ active: v })} />
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="ig-public" className="text-xs">
          Also reply “Sent you a DM!” publicly
        </Label>
        <Switch id="ig-public" checked={publicReply} disabled={pending} onCheckedChange={(v) => update({ publicReply: v })} />
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("Disconnect Instagram? Auto-replies stop immediately.")) return;
          start(async () => {
            const r = await disconnectInstagram();
            if (!r.ok) toast.error(r.error);
            else {
              toast.success("Instagram disconnected");
              router.refresh();
            }
          });
        }}
      >
        Disconnect
      </Button>
    </div>
  );
}
