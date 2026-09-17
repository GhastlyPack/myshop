"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GRADIENT_PRESETS } from "./gradients";
import { Field } from "./section";
import { uploadPublicImage } from "./upload";

export function BackgroundControls({
  gradient,
  overlay,
  imageKey,
  imageUrl,
  onGradient,
  onOverlay,
  onImage,
  resolveUrl,
}: {
  gradient: string | null;
  overlay: number;
  imageKey: string | null;
  imageUrl: string | null;
  onGradient: (css: string | null) => void;
  onOverlay: (v: number) => void;
  onImage: (key: string | null, url: string | null) => void;
  resolveUrl: (key: string) => Promise<string | null>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const knownGradient = gradient === null || GRADIENT_PRESETS.some((g) => g.css === gradient);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setUploading(true);
    try {
      const key = await uploadPublicImage(file, "bg");
      const url = await resolveUrl(key);
      onImage(key, url);
      toast.success("Background image uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <Field label="Gradient">
        <div role="radiogroup" aria-label="Background gradient" className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
          <GradientTile label="None" selected={gradient === null} onClick={() => onGradient(null)}>
            <span className="absolute inset-0 rounded-md bg-[repeating-linear-gradient(45deg,transparent_0_6px,var(--color-border)_6px_7px)]" />
          </GradientTile>
          {GRADIENT_PRESETS.map((g) => (
            <GradientTile key={g.key} label={g.label} selected={gradient === g.css} onClick={() => onGradient(g.css)}>
              <span className="absolute inset-0 rounded-md" style={{ background: g.css }} />
            </GradientTile>
          ))}
        </div>
        {!knownGradient && <p className="mt-2 text-[11px] text-muted-foreground">Using a custom gradient from your saved theme.</p>}
      </Field>

      <Field label="Image">
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} tabIndex={-1} />
        {imageKey ? (
          <div className="flex items-center gap-3 rounded-lg border bg-background p-2">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="size-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">Background image</p>
              <p className="truncate text-[11px] text-muted-foreground">{imageKey.split("/").pop()}</p>
            </div>
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              Replace
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove background image" onClick={() => onImage(null, null)}>
              <X />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-60"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {uploading ? "Uploading" : "Upload a background image"}
            <span className="hidden font-normal sm:inline">(JPG, PNG or WebP, up to 10 MB)</span>
          </button>
        )}
      </Field>

      <Field label={`Overlay ${Math.round(overlay * 100)}%`} htmlFor="bg-overlay">
        <input
          id="bg-overlay"
          type="range"
          min={0}
          max={0.8}
          step={0.05}
          value={overlay}
          onChange={(e) => onOverlay(Number(e.target.value))}
          className="w-full accent-foreground"
        />
        <p className="text-[11px] text-muted-foreground">Darkens the background so text stays readable over images and gradients.</p>
      </Field>
    </div>
  );
}

function GradientTile({ label, selected, onClick, children }: { label: string; selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "relative aspect-[4/3] overflow-hidden rounded-md border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        selected ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/40",
      )}
    >
      {children}
      <span className="absolute inset-x-0 bottom-0 bg-background/85 px-1 py-0.5 text-center text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}
