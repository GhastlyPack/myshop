"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PreviewMode = "phone" | "desktop";

const FRAME = {
  phone: { w: 390, h: 844 },
  desktop: { w: 1280, h: 800 },
} as const;

type Frame = { id: number; src: string; loaded: boolean };

/**
 * Double-buffered iframe: the previous document stays visible until the new
 * one has loaded, so live edits never flash white.
 */
function LiveFrame({ src, className }: { src: string; className?: string }) {
  // The server-rendered frame can finish loading before hydration attaches onLoad, so it starts visible.
  const [frames, setFrames] = useState<Frame[]>([{ id: 0, src, loaded: true }]);
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setFrames((prev) => {
      const current = prev[prev.length - 1];
      return [current, { id: current.id + 1, src, loaded: false }];
    });
  }
  const newest = frames[frames.length - 1];

  // Safety net: never leave a frame hidden if its load event is missed.
  useEffect(() => {
    if (newest.loaded) return;
    const t = setTimeout(() => setFrames((prev) => prev.filter((x) => x.id === newest.id).map((x) => ({ ...x, loaded: true }))), 2500);
    return () => clearTimeout(t);
  }, [newest.id, newest.loaded]);

  return (
    <div className={cn("relative", className)}>
      {frames.map((f) => (
        <iframe
          key={f.id}
          src={f.src}
          title="Store preview"
          className={cn("absolute inset-0 size-full border-0 bg-white transition-opacity duration-150", f.id === newest.id && !f.loaded ? "opacity-0" : "opacity-100")}
          onLoad={() => setFrames((prev) => prev.filter((x) => x.id === f.id).map((x) => ({ ...x, loaded: true })))}
        />
      ))}
    </div>
  );
}

export function Preview({ storeUrl, previewSrc, mode, onModeChange }: { storeUrl: string; previewSrc: string; mode: PreviewMode; onModeChange: (m: PreviewMode) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [copied, setCopied] = useState(false);
  const { w, h } = FRAME[mode];

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const compute = () => {
      const byWidth = el.clientWidth / w;
      const byHeight = Math.max(320, window.innerHeight - 140) / h;
      setScale(Math.min(1, byWidth, byHeight));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [w, h]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast.success("Store link copied.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy. Select the link and copy it manually.");
    }
  }

  const displayUrl = storeUrl.replace(/^https?:\/\//, "");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs">
          <span className="truncate font-medium">{displayUrl}</span>
        </div>
        <Button type="button" variant="outline" size="icon" aria-label="Copy store link" onClick={copy}>
          {copied ? <Check /> : <Copy />}
        </Button>
        <Button asChild variant="outline" size="icon" aria-label="Open store in a new tab">
          <a href={storeUrl} target="_blank" rel="noreferrer">
            <ExternalLink />
          </a>
        </Button>
        <div role="radiogroup" aria-label="Preview device" className="flex rounded-lg border bg-muted p-0.5">
          {(
            [
              { value: "phone", label: "Phone", Icon: Smartphone },
              { value: "desktop", label: "Desktop", Icon: Monitor },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              aria-label={label}
              onClick={() => onModeChange(value)}
              className={cn("rounded-md p-1.5 transition-colors", mode === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      <div ref={wrapRef} className="flex w-full justify-center">
        <div style={{ width: Math.round(w * scale), height: Math.round(h * scale) }}>
          <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            {mode === "phone" ? (
              <div className="relative size-full rounded-[56px] bg-neutral-900 p-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,.5)] ring-1 ring-black/40">
                <div className="absolute top-3 left-1/2 z-10 h-[28px] w-[100px] -translate-x-1/2 translate-y-2 rounded-full bg-neutral-900" />
                <div className="size-full overflow-hidden rounded-[44px] bg-white">
                  <LiveFrame src={previewSrc} className="size-full" />
                </div>
              </div>
            ) : (
              <div className="flex size-full flex-col overflow-hidden rounded-xl bg-neutral-900 shadow-[0_30px_80px_-30px_rgba(0,0,0,.5)] ring-1 ring-black/40">
                <div className="flex h-11 shrink-0 items-center gap-2 px-4">
                  <span className="size-3 rounded-full bg-neutral-600" />
                  <span className="size-3 rounded-full bg-neutral-600" />
                  <span className="size-3 rounded-full bg-neutral-600" />
                  <span className="ml-3 flex h-7 flex-1 items-center rounded-md bg-neutral-800 px-3 text-sm text-neutral-300">{displayUrl}</span>
                </div>
                <div className="min-h-0 flex-1 bg-white">
                  <LiveFrame src={previewSrc} className="size-full" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
