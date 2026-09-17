"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadFile, type UploadScope } from "@/lib/uploads-client";

/**
 * Picks an image, uploads it straight to the public bucket and reports the storage key.
 * `initialUrl` is the resolved public URL of the current value (computed server-side).
 */
export function ImageUpload({
  scope,
  initialUrl,
  onChange,
  shape = "square",
  label,
  hint,
  className,
}: {
  scope: UploadScope;
  initialUrl: string | null;
  onChange: (key: string | null) => void;
  shape?: "square" | "wide" | "circle";
  label: string;
  hint?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file.");
    if (file.size > 10 * 1024 * 1024) return toast.error("Images must be under 10 MB.");
    const local = URL.createObjectURL(file);
    setPreview(local);
    setProgress(0);
    try {
      const { key } = await uploadFile(file, { bucket: "public", scope, onProgress: setProgress });
      onChange(key);
    } catch (e) {
      setPreview(initialUrl);
      toast.error((e as Error).message);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const frame = shape === "wide" ? "aspect-[3/1] w-full" : shape === "circle" ? "size-24 rounded-full" : "size-24";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-sm font-medium">{label}</div>
      <div className={cn("flex gap-4", shape === "wide" ? "flex-col" : "items-center")}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative shrink-0 overflow-hidden rounded-lg border border-dashed bg-muted/40 text-muted-foreground transition-colors hover:bg-muted",
            frame,
            shape === "circle" && "rounded-full",
          )}
          aria-label={`Upload ${label.toLowerCase()}`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center">
              <ImageIcon className="size-5" />
            </span>
          )}
          {progress !== null && (
            <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs font-medium text-foreground">
              <Loader2 className="mr-1 size-3 animate-spin" /> {progress}%
            </span>
          )}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={progress !== null}>
            <Upload data-icon="inline-start" /> {preview ? "Replace" : "Upload"}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={progress !== null}
              onClick={() => {
                setPreview(null);
                onChange(null);
              }}
            >
              <Trash2 data-icon="inline-start" /> Remove
            </Button>
          )}
          {hint && <p className="basis-full text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
