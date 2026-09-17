"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ga } from "@/lib/ga";

export function CopyButton({ text, label = "Copy link", size = "icon-sm" }: { text: string; label?: string; size?: "icon-sm" | "sm" }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      ga("link_copied", { label });
      toast.success("Link copied.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy. Long-press the link instead.");
    }
  }
  return (
    <Button type="button" variant="ghost" size={size} onClick={copy} aria-label={label} title={label}>
      {copied ? <Check className="text-emerald-600" /> : <Copy />}
      {size === "sm" && <span>{copied ? "Copied" : label}</span>}
    </Button>
  );
}
