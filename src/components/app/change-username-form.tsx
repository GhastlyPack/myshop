"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { checkUsername } from "@/app/app/onboarding/actions";
import { changeUsername } from "@/app/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeUsername, usernameError } from "@/lib/reserved";

type Remote = { for: string; ok: boolean; message: string };

export function ChangeUsernameForm({ current, host }: { current: string; host: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [remote, setRemote] = useState<Remote | null>(null);
  const [pending, start] = useTransition();
  const normalized = normalizeUsername(value);
  const unchanged = normalized === current;
  const localError = unchanged ? null : usernameError(normalized);

  // Debounced server availability check; state is only set from the async callback.
  useEffect(() => {
    if (unchanged || localError) return;
    const t = setTimeout(async () => {
      const r = await checkUsername(normalized);
      setRemote({ for: normalized, ok: r.available, message: r.available ? `${host}/${r.username} is available.` : (r.error ?? "Not available.") });
    }, 350);
    return () => clearTimeout(t);
  }, [normalized, unchanged, localError, host]);

  const state: "idle" | "checking" | "ok" | "bad" = unchanged ? "idle" : localError ? "bad" : remote?.for === normalized ? (remote.ok ? "ok" : "bad") : "checking";
  const message = unchanged ? null : localError ?? (remote?.for === normalized ? remote.message : null);

  function save() {
    start(async () => {
      const r = await changeUsername(normalized);
      if (!r.ok) {
        setRemote({ for: normalized, ok: false, message: r.error });
        return;
      }
      toast.success(`Your link is now ${host}/${r.username}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border bg-background p-4 sm:p-5">
      <div>
        <Label htmlFor="username">Your link</Label>
        <p className="text-xs text-muted-foreground">This is what goes in your bio. Changing it breaks the old link right away, so update your bio too.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-md border bg-background pl-3 focus-within:ring-2 focus-within:ring-ring">
          <span className="shrink-0 text-sm text-muted-foreground">{host}/</span>
          <Input id="username" value={value} onChange={(e) => setValue(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} className="border-0 shadow-none focus-visible:ring-0" />
          {state === "ok" && <Check className="mr-2 size-4 text-green-600" />}
          {state === "bad" && <X className="mr-2 size-4 text-destructive" />}
        </div>
        <Button onClick={save} disabled={unchanged || state !== "ok" || pending}>
          {pending ? "Saving…" : "Change link"}
        </Button>
      </div>
      {message && <p className={`text-xs ${state === "bad" ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>}
      {state === "checking" && <p className="text-xs text-muted-foreground">Checking…</p>}
    </div>
  );
}
