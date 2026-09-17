"use client";

/**
 * Browser-side upload helper. Asks /api/uploads/ticket for a destination, then
 * PUTs the bytes straight there (S3 presigned URL in prod, /api/dev/upload locally)
 * with XHR so we get progress events. Returns the storage key to persist.
 */
export type UploadBucket = "files" | "public";
export type UploadScope = "product" | "avatar" | "thumb" | "banner" | "bg";

export type UploadOptions = {
  bucket: UploadBucket;
  scope: UploadScope;
  /** 0..100 */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
};

type Ticket = { key: string; url: string; method: "PUT"; headers: Record<string, string> };

export class UploadError extends Error {}

export async function uploadFile(file: File, opts: UploadOptions): Promise<{ key: string }> {
  const contentType = file.type || "application/octet-stream";
  const res = await fetch("/api/uploads/ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket: opts.bucket, scope: opts.scope, filename: file.name, contentType, bytes: file.size }),
    signal: opts.signal,
  });
  const body = (await res.json().catch(() => null)) as (Ticket & { error?: string }) | null;
  if (!res.ok || !body?.url) throw new UploadError(body?.error ?? "Could not start the upload.");
  const ticket = body;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(ticket.method, ticket.url);
    for (const [k, v] of Object.entries(ticket.headers ?? {})) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        opts.onProgress?.(100);
        resolve();
      } else reject(new UploadError(`Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new UploadError("Upload failed. Check your connection and try again."));
    xhr.onabort = () => reject(new UploadError("Upload cancelled."));
    opts.signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });

  return { key: ticket.key };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}
