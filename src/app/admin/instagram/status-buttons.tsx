"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setInstagramBetaStatus } from "./actions";

export function StatusButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (s: "approved" | "denied" | "pending") =>
    start(async () => {
      const r = await setInstagramBetaStatus(id, s);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(`Marked ${s}`);
        router.refresh();
      }
    });
  return (
    <div className="flex justify-end gap-2">
      {status !== "approved" && (
        <Button size="sm" disabled={pending} onClick={() => set("approved")}>
          Approve
        </Button>
      )}
      {status !== "denied" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => set("denied")}>
          Deny
        </Button>
      )}
    </div>
  );
}
