"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { disconnectInstagram, setInstagramOptions } from "@/app/app/settings/actions";

function Row({ title, hint, checked, disabled, onChange, id }: { title: string; hint: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  );
}

export function InstagramControls({ publicReply, active }: { publicReply: boolean; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const update = (patch: { publicReply?: boolean; active?: boolean }) =>
    start(async () => {
      const r = await setInstagramOptions(patch);
      if (!r.ok) toast.error(r.error);
      else router.refresh();
    });
  return (
    <div className="divide-y rounded-lg border px-4">
      <Row id="ig-active" title="Auto-replies" hint="Reply to keyword comments and DMs with the product link." checked={active} disabled={pending} onChange={(v) => update({ active: v })} />
      <Row id="ig-public" title="Public comment reply" hint="Also reply “Sent you a DM!” under the comment so others see it works." checked={publicReply} disabled={pending} onChange={(v) => update({ publicReply: v })} />
      <div className="flex items-center justify-between gap-4 py-3">
        <div className="text-xs text-muted-foreground">Disconnecting stops replies immediately and forgets the token.</div>
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
    </div>
  );
}
