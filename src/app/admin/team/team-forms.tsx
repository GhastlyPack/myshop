"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addAdmin, removeAdmin } from "./actions";

export function TeamForms(props: { mode: "add" } | { mode: "remove"; email: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();

  if (props.mode === "remove") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Remove admin access for ${props.email}?`)) return;
          start(async () => {
            const r = await removeAdmin(props.email);
            if (!r.ok) toast.error(r.error);
            else {
              toast.success("Removed");
              router.refresh();
            }
          });
        }}
      >
        Remove
      </Button>
    );
  }

  return (
    <form
      className="flex max-w-md gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addAdmin(email);
          if (!r.ok) toast.error(r.error);
          else {
            toast.success(`${email.trim()} is now an admin`);
            setEmail("");
            router.refresh();
          }
        });
      }}
    >
      <Input type="email" required placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button type="submit" disabled={pending || !email}>
        {pending ? "Adding…" : "Add admin"}
      </Button>
    </form>
  );
}
