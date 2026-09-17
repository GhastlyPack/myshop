"use client";

import { useTransition } from "react";
import { Check, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { approveReview, deleteReview, hideReview } from "../actions";

export function ReviewActions({ id, approved }: { id: string; approved: boolean }) {
  const [pending, start] = useTransition();

  function run(label: string, fn: (id: string) => Promise<{ ok: true }>) {
    start(async () => {
      try {
        await fn(id);
        toast.success(label);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      {approved ? (
        <Button variant="outline" size="xs" disabled={pending} onClick={() => run("Review hidden", hideReview)}>
          <EyeOff /> Hide
        </Button>
      ) : (
        <Button size="xs" disabled={pending} onClick={() => run("Review approved", approveReview)}>
          <Check /> Approve
        </Button>
      )}
      <Button
        variant="ghost"
        size="xs"
        disabled={pending}
        aria-label="Delete review"
        onClick={() => {
          if (window.confirm("Delete this review permanently?")) run("Review deleted", deleteReview);
        }}
      >
        <Trash2 /> Delete
      </Button>
    </div>
  );
}
