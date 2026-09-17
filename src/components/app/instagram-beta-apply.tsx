"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { applyForInstagramBeta } from "@/app/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InstagramBetaApply() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await applyForInstagramBeta(username);
          if (!r.ok) toast.error(r.error);
          else {
            toast.success("You're on the list. We'll email you when you're in.");
            router.refresh();
          }
        });
      }}
    >
      <p className="text-sm text-muted-foreground">Auto-replies are in private beta while we finish Instagram&apos;s review. Drop your handle to get early access.</p>
      <div className="flex max-w-md items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-md border bg-background pl-3 focus-within:ring-2 focus-within:ring-ring">
          <span className="text-sm text-muted-foreground">@</span>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="yourhandle"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <Button type="submit" disabled={pending || !username.trim()}>
          {pending ? "Applying…" : "Apply for access"}
        </Button>
      </div>
    </form>
  );
}
