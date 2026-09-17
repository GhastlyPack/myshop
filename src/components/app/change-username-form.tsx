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

export function ChangeUsernameForm({ current, host }: { current: string; host: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [status, setStatus] = useState<{ state: "idle" | "checking" | "ok" | "bad"; message?: string }>({ state: "idle" });
  const [pending, start] = useTransition();
  const normalized = normalizeUsername(value);
  const unchanged = normalized === current;

  useEffect(() => {
    if (unchanged) {
      setStatus({ state: "idle" });
      return;
    }
    const local = usernameError(normalized);
    if (local) {
      setStatus({ state: "bad", message: local });
      return;
    }
    setStatus({ state: "checking" });
    const t = setTimeout(async () => {
      const r = await checkUsername(normalized);
      setStatus(r.available ? { state: "ok", message: `${host}/${r.username} is available.` } : { state: "bad", message: r.error ?? "Not available." });
    }, 350);
    return () => clearTimeout(t);
  }, [normalized, unchanged, host]);

  function save() {
    start(async () => {
      const r = await changeUsername(normalized);
      if (!r.ok) {
        setStatus({ state: "bad", message: r.error });
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
          <Input
            id="username"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="border-0 shadow-none focus-visible:ring-0"
          />
          {status.state === "ok" && <Check className="mr-2 size-4 text-green-600" />}
          {status.state === "bad" && <X className="mr-2 size-4 text-destructive" />}
        </div>
        <Button onClick={save} disabled={unchanged || status.state !== "ok" || pending}>
          {pending ? "Saving…" : "Change link"}
        </Button>
      </div>
      {status.message && <p className={`text-xs ${status.state === "bad" ? "text-destructive" : "text-muted-foreground"}`}>{status.message}</p>}
      {status.state === "checking" && <p className="text-xs text-muted-foreground">Checking…</p>}
    </div>
  );
}
