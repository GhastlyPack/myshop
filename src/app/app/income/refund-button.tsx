"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RefundButton({
  orderId,
  status,
  amountLabel,
  action,
}: {
  orderId: string;
  status: string;
  amountLabel: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Refund ${amountLabel} to this buyer? This can't be undone and disables their download link.`)) {
          e.preventDefault();
          return;
        }
        setBusy(true);
      }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant="outline" size="xs" disabled={busy}>
        {busy ? "Refunding…" : "Refund"}
      </Button>
    </form>
  );
}
