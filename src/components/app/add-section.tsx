"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createSection } from "@/app/app/sections/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddSection({ variant = "outline" }: { variant?: "default" | "outline" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" /> Add section
      </Button>
    );
  }

  return (
    <form
      className="flex w-full max-w-sm items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createSection(title);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          setTitle("");
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Section name, e.g. Templates" maxLength={80} autoFocus />
      <Button type="submit" disabled={pending || !title.trim()}>
        {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
        Add
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
