"use client";

import { useRef, useState } from "react";
import { AlertTriangle, FileIcon, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { addProductFile, deleteProductFile, type FileRow } from "@/app/app/products/[id]/actions";
import type { TabProps } from "@/components/app/product-editor/editor";
import { Field, FieldError, FieldHint } from "@/components/app/product-editor/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBytes, uploadFile } from "@/lib/uploads-client";

const WARN_BYTES = 500 * 1024 * 1024;
const MAX_BYTES = 5 * 1024 * 1024 * 1024;

type Pending = { localId: string; name: string; bytes: number; progress: number; error?: string };

export function ContentTab({
  form,
  update,
  errors,
  productId,
  files,
  setFiles,
}: TabProps & { productId: string; files: FileRow[]; setFiles: React.Dispatch<React.SetStateAction<FileRow[]>> }) {
  return form.type === "download" ? (
    <FilesPanel productId={productId} files={files} setFiles={setFiles} error={errors.files} />
  ) : (
    <LinksPanel form={form} update={update} errors={errors} />
  );
}

function FilesPanel({
  productId,
  files,
  setFiles,
  error,
}: {
  productId: string;
  files: FileRow[];
  setFiles: React.Dispatch<React.SetStateAction<FileRow[]>>;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  function patch(localId: string, p: Partial<Pending>) {
    setPending((list) => list.map((x) => (x.localId === localId ? { ...x, ...p } : x)));
  }

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const picked = Array.from(list);
    if (inputRef.current) inputRef.current.value = "";
    for (const file of picked) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is over the 5 GB limit.`);
        continue;
      }
      if (file.size > WARN_BYTES) toast.warning(`${file.name} is ${formatBytes(file.size)}. Large files upload slowly and buyers download slowly too.`);
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setPending((p) => [...p, { localId, name: file.name, bytes: file.size, progress: 0 }]);
      try {
        const { key } = await uploadFile(file, { bucket: "files", scope: "product", onProgress: (pct) => patch(localId, { progress: pct }) });
        const res = await addProductFile(productId, { key, filename: file.name, bytes: file.size, mime: file.type || null });
        if (!res.ok && res.code === "card_required") {
          toast.info("Add a card to start your free trial, then upload your files.");
          // Full-page navigation: this route 303-redirects to Stripe Checkout (external), so router.push can't follow it.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/api/billing/checkout?plan=basic&interval=month";
          return;
        }
        if (!res.ok) throw new Error(res.error);
        setFiles((f) => [...f, res.file]);
        setPending((p) => p.filter((x) => x.localId !== localId));
      } catch (e) {
        patch(localId, { error: (e as Error).message });
      }
    }
  }

  async function remove(file: FileRow) {
    setDeleting(file.id);
    const res = await deleteProductFile(productId, file.id);
    setDeleting(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setFiles((f) => f.filter((x) => x.id !== file.id));
  }

  return (
    <div className="space-y-4 rounded-xl border bg-background p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold">Files</h2>
        <p className="text-xs text-muted-foreground">Buyers get a private download link for each file after checkout. Files save as soon as they finish uploading.</p>
      </div>
      <FieldError>{error}</FieldError>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground transition-colors hover:bg-muted/60"
      >
        <Upload className="size-5" />
        <span>
          <span className="font-medium text-foreground">Choose files</span> or drag them here
        </span>
        <span className="text-xs">PDF, ZIP, video, audio, anything up to 5 GB. Over 500 MB gets a warning.</span>
      </button>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

      {(files.length > 0 || pending.length > 0) && (
        <ul className="divide-y rounded-lg border">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2">
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{f.filename}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatBytes(f.bytes)}</span>
                  {f.bytes > WARN_BYTES && (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <AlertTriangle className="size-3" /> Large file
                    </span>
                  )}
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${f.filename}`} disabled={deleting === f.id} onClick={() => remove(f)}>
                {deleting === f.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
              </Button>
            </li>
          ))}
          {pending.map((p) => (
            <li key={p.localId} className="space-y-1.5 px-3 py-2">
              <div className="flex items-center gap-3">
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.error ? <span className="text-destructive">{p.error}</span> : `${formatBytes(p.bytes)} · ${p.progress}%`}</div>
                </div>
                {p.error ? (
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={() => setPending((l) => l.filter((x) => x.localId !== p.localId))}>
                    <X />
                  </Button>
                ) : (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {!p.error && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${p.progress}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LinksPanel({ form, update, errors }: TabProps) {
  const links = form.links;
  function setLink(i: number, patch: Partial<{ url: string; label: string }>) {
    update({ links: links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });
  }
  return (
    <div className="space-y-4 rounded-xl border bg-background p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold">Links</h2>
        <p className="text-xs text-muted-foreground">Shown to the buyer on the thank-you page and in their email. Saved with the product.</p>
      </div>
      <FieldError>{errors.links}</FieldError>
      {links.length === 0 && <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">No links yet. Add a Notion page, a private video, a Zoom invite, anything with a URL.</p>}
      <div className="space-y-3">
        {links.map((l, i) => (
          <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="URL" htmlFor={`link-url-${i}`}>
              <Input id={`link-url-${i}`} value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} placeholder="https://" inputMode="url" />
            </Field>
            <Field label="Label" htmlFor={`link-label-${i}`}>
              <Input id={`link-label-${i}`} value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} placeholder="Open the workbook" maxLength={120} />
            </Field>
            <Button type="button" variant="ghost" size="icon" aria-label="Remove link" onClick={() => update({ links: links.filter((_, idx) => idx !== i) })}>
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => update({ links: [...links, { url: "", label: "" }] })}>
        <Plus data-icon="inline-start" /> Add link
      </Button>
      <FieldHint>Click Save in the header to keep your changes.</FieldHint>
    </div>
  );
}
