"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Plain POST form to the disconnect route, with a confirm step. Used by <PaymentsSettings/>. */
export function StripeDisconnectButton() {
  const [busy, setBusy] = useState(false);
  return (
    <form
      method="post"
      action="/api/payments/stripe/disconnect"
      onSubmit={(e) => {
        if (!window.confirm("Disconnect Stripe? Paid products stop being purchasable until you reconnect. Past orders are kept.")) {
          e.preventDefault();
          return;
        }
        setBusy(true);
      }}
    >
      <Button type="submit" variant="outline" size="sm" disabled={busy}>
        {busy ? "Disconnecting…" : "Disconnect"}
      </Button>
    </form>
  );
}
