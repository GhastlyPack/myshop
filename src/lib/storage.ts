import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SignJWT, jwtVerify } from "jose";
import { env, s3Configured } from "@/lib/env";
import { newToken } from "@/lib/ids";

/**
 * Storage abstraction. Two buckets:
 *   - "files":  private product files. Never public; downloads go through /d/[token] → short-lived signed GET.
 *   - "public": thumbnails, avatars, backgrounds. Publicly readable.
 * Driver = S3 when AWS env is set, else local filesystem under .data/ (dev only).
 */
export type Bucket = "files" | "public";

export type UploadTicket = {
  key: string;
  /** Where the browser should PUT the bytes. */
  url: string;
  method: "PUT";
  headers: Record<string, string>;
};

const LOCAL_ROOT = path.join(process.cwd(), ".data");
const secret = new TextEncoder().encode(env.SESSION_SECRET);

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 120) || "file";
}

/** Deterministic, collision-free key. */
export function makeKey(scope: string, filename: string) {
  return `${scope}/${newToken().slice(0, 12)}-${safeName(filename)}`;
}

// ---------- S3 driver ----------
const s3 = s3Configured
  ? new S3Client({
      region: env.AWS_REGION,
      credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID!, secretAccessKey: env.AWS_SECRET_ACCESS_KEY! },
    })
  : null;

function bucketName(b: Bucket) {
  return b === "files" ? env.S3_BUCKET_FILES! : env.S3_BUCKET_PUBLIC!;
}

// ---------- public API ----------

/** Ticket for a direct browser upload. */
export async function createUploadTicket(bucket: Bucket, key: string, contentType: string, bytes: number): Promise<UploadTicket> {
  if (s3) {
    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: bucketName(bucket), Key: key, ContentType: contentType, ContentLength: bytes }),
      { expiresIn: 60 * 15 },
    );
    return { key, url, method: "PUT", headers: { "Content-Type": contentType } };
  }
  // Local: signed token the /api/dev/upload route verifies.
  const token = await new SignJWT({ bucket, key, contentType }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("15m").sign(secret);
  return { key, url: `/api/dev/upload?t=${token}`, method: "PUT", headers: { "Content-Type": contentType } };
}

/** Dev-only: called by /api/dev/upload after verifying the ticket. */
export async function localPut(token: string, body: Buffer) {
  const { payload } = await jwtVerify(token, secret);
  const bucket = payload.bucket as Bucket;
  const key = payload.key as string;
  if (!key || key.includes("..")) throw new Error("bad key");
  const full = path.join(LOCAL_ROOT, bucket, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
  return { bucket, key };
}

/** Dev-only: stream a local object. */
export async function localGet(bucket: Bucket, key: string) {
  if (key.includes("..")) throw new Error("bad key");
  const full = path.join(LOCAL_ROOT, bucket, key);
  const s = await stat(full);
  return { body: await readFile(full), bytes: s.size };
}

/** Public URL for a "public" bucket object (thumbnails, avatars). */
export function publicUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (s3) return `${env.S3_PUBLIC_BASE_URL ?? `https://${env.S3_BUCKET_PUBLIC}.s3.${env.AWS_REGION}.amazonaws.com`}/${key}`;
  return `/api/dev/file/public/${key}`;
}

/** Short-lived download URL for a private file. Caller has already checked the entitlement. */
export async function signedDownloadUrl(key: string, filename: string, expiresIn = 60): Promise<string> {
  if (s3) {
    return getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucketName("files"),
        Key: key,
        ResponseContentDisposition: `attachment; filename="${safeName(filename)}"`,
      }),
      { expiresIn },
    );
  }
  const token = await new SignJWT({ key, filename }).setProtectedHeader({ alg: "HS256" }).setExpirationTime(`${expiresIn}s`).sign(secret);
  return `/api/dev/file/files?t=${token}`;
}

/** Dev-only: verify a signed local download token. */
export async function verifyLocalDownload(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return { key: payload.key as string, filename: payload.filename as string };
}

export async function deleteObject(bucket: Bucket, key: string) {
  if (s3) {
    await s3.send(new DeleteObjectCommand({ Bucket: bucketName(bucket), Key: key }));
    return;
  }
  if (key.includes("..")) return;
  await unlink(path.join(LOCAL_ROOT, bucket, key)).catch(() => {});
}

export function etag(buf: Buffer) {
  return createHash("md5").update(buf).digest("hex");
}

export const MAX_FILE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
export const WARN_FILE_BYTES = 500 * 1024 * 1024; // 500 MB
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
