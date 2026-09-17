import "server-only";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { env, resendConfigured } from "@/lib/env";
import { newId } from "@/lib/ids";

/**
 * Mail abstraction. Resend when configured, else a dev outbox on disk that
 * /dev/outbox renders so you can click the links locally.
 */
export type Mail = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
};

const OUTBOX = path.join(process.cwd(), ".data", "outbox");
const resend = resendConfigured ? new Resend(env.RESEND_API_KEY) : null;

export async function sendMail(mail: Mail): Promise<{ id: string; driver: "resend" | "outbox" }> {
  const from = mail.from ?? env.EMAIL_FROM;
  if (resend) {
    const res = await resend.emails.send({
      from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: mail.replyTo,
    });
    if (res.error) throw new Error(`Resend: ${res.error.message}`);
    return { id: res.data?.id ?? "unknown", driver: "resend" };
  }
  const id = newId("mail");
  await mkdir(OUTBOX, { recursive: true });
  await writeFile(path.join(OUTBOX, `${Date.now()}-${id}.json`), JSON.stringify({ id, from, ...mail, at: new Date().toISOString() }, null, 2));
  console.log(`[outbox] → ${mail.to}: ${mail.subject}`);
  return { id, driver: "outbox" };
}

export type OutboxItem = Mail & { id: string; from: string; at: string; file: string };

/** Dev-only. */
export async function readOutbox(limit = 50): Promise<OutboxItem[]> {
  await mkdir(OUTBOX, { recursive: true });
  const files = (await readdir(OUTBOX)).filter((f) => f.endsWith(".json")).sort().reverse().slice(0, limit);
  const items: OutboxItem[] = [];
  for (const f of files) {
    try {
      items.push({ ...(JSON.parse(await readFile(path.join(OUTBOX, f), "utf8")) as Omit<OutboxItem, "file">), file: f });
    } catch {}
  }
  return items;
}

export async function readOutboxItem(file: string): Promise<OutboxItem | null> {
  if (file.includes("/") || file.includes("..")) return null;
  try {
    return { ...(JSON.parse(await readFile(path.join(OUTBOX, file), "utf8")) as Omit<OutboxItem, "file">), file };
  } catch {
    return null;
  }
}
