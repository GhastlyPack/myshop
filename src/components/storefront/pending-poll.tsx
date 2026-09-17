"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const INTERVAL_MS = 2000;
const MAX_MS = 60_000;

/** Paid flow: the webhook may land after the redirect. Re-render every 2s for up to 60s. */
export function PendingPoll({ email }: { email: string }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => {
      if (Date.now() - start > MAX_MS) {
        clearInterval(t);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, INTERVAL_MS);
    return () => clearInterval(t);
  }, [router]);
  return (
    <div className="sf-surface p-6 text-center sm:p-8">
      {gaveUp ? (
        <>
          <h1 className="sf-heading text-[1.4rem]">Still confirming…</h1>
          <p className="sf-muted mt-2 text-[0.95rem]">
            Your payment is taking longer than usual to confirm. Keep this page open, or watch your inbox at {email}: your download link arrives the moment it clears.
          </p>
          <button type="button" className="sf-btn sf-btn-ghost mt-5" onClick={() => router.refresh()}>
            Check again
          </button>
        </>
      ) : (
        <>
          <div className="sf-pulse mx-auto mb-4 h-2 w-16 rounded-full" style={{ background: "var(--sf-accent)" }} />
          <h1 className="sf-heading text-[1.4rem]">Confirming your payment…</h1>
          <p className="sf-muted mt-2 text-[0.95rem]">This usually takes a few seconds. Your downloads will appear here automatically.</p>
        </>
      )}
    </div>
  );
}
