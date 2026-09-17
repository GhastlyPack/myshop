import { NextResponse } from "next/server";
import { isProd, s3Configured } from "@/lib/env";
import { localGet, verifyLocalDownload } from "@/lib/storage";

/**
 * Dev-only file server.
 *   /api/dev/file/public/<key>   → public bucket (thumbnails, avatars)
 *   /api/dev/file/files?t=<jwt>  → private bucket, token from signedDownloadUrl()
 */
export async function GET(req: Request, ctx: { params: Promise<{ bucket: string; key?: string[] }> }) {
  if (isProd || s3Configured) return new NextResponse("disabled", { status: 404 });
  const { bucket, key } = await ctx.params;
  try {
    if (bucket === "public") {
      const k = (key ?? []).join("/");
      const { body } = await localGet("public", k);
      return new NextResponse(new Uint8Array(body), { headers: { "Content-Type": guessMime(k), "Cache-Control": "public, max-age=3600" } });
    }
    if (bucket === "files") {
      const t = new URL(req.url).searchParams.get("t");
      if (!t) return new NextResponse("missing token", { status: 400 });
      const { key: k, filename } = await verifyLocalDownload(t);
      const { body } = await localGet("files", k);
      return new NextResponse(new Uint8Array(body), {
        headers: {
          "Content-Type": guessMime(filename),
          "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    return new NextResponse("not found", { status: 404 });
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
}

function guessMime(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    pdf: "application/pdf", zip: "application/zip", mp4: "video/mp4", mp3: "audio/mpeg", txt: "text/plain", json: "application/json",
  };
  return (ext && map[ext]) || "application/octet-stream";
}
