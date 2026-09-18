"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { disconnectCalendar } from "@/app/app/settings/actions";
import { Button } from "@/components/ui/button";

export function CalendarDisconnect() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await disconnectCalendar();
          toast.success("Calendar disconnected.");
          router.refresh();
        })
      }
    >
      {pending ? "Disconnecting…" : "Disconnect"}
    </Button>
  );
}
