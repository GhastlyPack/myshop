/** Browser side of the two-step upload: ticket → direct PUT. Returns the storage key. */
export async function uploadPublicImage(file: File, scope: "bg" | "avatar" | "thumb" | "banner"): Promise<string> {
  const res = await fetch("/api/uploads/ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket: "public",
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      bytes: file.size,
      scope,
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Could not start the upload.");
  }
  const ticket = (await res.json()) as { key: string; url: string; method: "PUT"; headers: Record<string, string> };
  const put = await fetch(ticket.url, { method: ticket.method, headers: ticket.headers, body: file });
  if (!put.ok) throw new Error("Upload failed. Please try again.");
  return ticket.key;
}
