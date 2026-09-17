"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeUsername, usernameError } from "@/lib/reserved";
import { ga } from "@/lib/ga";

/**
 * "visitmy.shop/ [yourname] → Claim" on the lander. Sends the visitor to
 * login with a returnTo that pre-fills onboarding with the name they typed.
 * An empty box still works: it just goes to login → /app.
 */
export function ClaimForm({ loginBase, tone = "light", autoFocus }: { loginBase: string; tone?: "light" | "orange"; autoFocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const u = normalizeUsername(value);
    const err = u ? usernameError(u) : null;
    if (err) {
      setError(err);
      return;
    }
    ga("claim_link_start", { location: tone === "orange" ? "footer_cta" : "hero", username_entered: Boolean(u) });
    const returnTo = u ? `/app/onboarding?username=${encodeURIComponent(u)}` : "/app";
    router.push(`${loginBase}?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md" noValidate>
      <div className="ld-claim">
        <span className="ld-claim-prefix" aria-hidden>
          visitmy.shop/
        </span>
        <input
          aria-label="Your username"
          placeholder="yourname"
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={30}
          onChange={(e) => {
            setError(null);
            setValue(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""));
          }}
        />
        <button type="submit" className={`ld-btn ld-btn-sm ${tone === "orange" ? "ld-btn-ink" : "ld-btn-primary"}`}>
          Claim your link
        </button>
      </div>
      <p className={`mt-2.5 min-h-5 pl-4 text-xs ${error ? "text-red-600" : tone === "orange" ? "text-white/75" : "ld-muted"}`} aria-live="polite">
        {error ?? "Letters, numbers, dots and underscores."}
      </p>
    </form>
  );
}
