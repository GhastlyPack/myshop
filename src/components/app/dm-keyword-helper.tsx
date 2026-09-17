"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * "Instagram kit" for a product with a DM keyword: caption, auto-reply DM text and
 * a story/bio CTA, each copyable. Rendered inside the product editor (Package A).
 */
export function DmKeywordHelper({ username, slug, keyword, title, replyText }: { username: string; slug: string; keyword: string | null; title: string; replyText?: string | null }) {
  // Base URL comes from the browser (client-side); empty during SSR so the link renders relative.
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );

  const kw = keyword?.trim().toUpperCase() ?? "";
  if (!kw) {
    return <p className="text-xs text-muted-foreground">Add a DM keyword to generate a ready-to-paste Instagram caption, auto-reply and story CTA.</p>;
  }

  const link = `${origin || ""}/${username}/${slug}`;
  const blocks = [
    {
      label: "Post caption",
      hint: "End your caption with this so people know what to comment.",
      text: `${title} is ready.\n\nComment ${kw} and I'll send it to you.`,
    },
    {
      label: "Auto-reply DM",
      hint: "Sent automatically when Instagram is connected. A product card with a button follows this message.",
      text: replyText?.trim()
        ? replyText.replace(/\{\{\s*link\s*\}\}/gi, link).replace(/\{\{\s*title\s*\}\}/gi, title).replace(/\{\{\s*name\s*\}\}/gi, "@theirname") + (replyText.includes("{{link}}") ? "" : `\n${link}`)
        : `Here's ${title}: ${link}`,
    },
    {
      label: "Story / bio CTA",
      hint: "One line for a story sticker or your bio.",
      text: `DM me "${kw}" for ${title}`,
    },
  ];

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Instagram kit</CardTitle>
        <CardDescription>
          Keyword <span className="font-mono font-medium text-foreground">{kw}</span> sends people to <span className="break-all font-mono">{link}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {blocks.map((b) => (
          <CopyBlock key={b.label} label={b.label} hint={b.hint} text={b.text} />
        ))}
        <p className="text-xs text-muted-foreground">With Instagram connected in Settings, the DM goes out automatically. The caption and CTA are for you to post.</p>
      </CardContent>
    </Card>
  );
}

function CopyBlock({ label, hint, text }: { label: string; hint: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (await copyText(text)) {
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
        <Button type="button" variant="outline" size="xs" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{text}</pre>
    </div>
  );
}

/** Clipboard API first; legacy execCommand fallback for contexts that deny it. */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
