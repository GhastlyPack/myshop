import Link from "next/link";
import { redirect } from "next/navigation";
import { isProd, resendConfigured } from "@/lib/env";
import { readOutbox } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export default async function Outbox() {
  if (isProd || resendConfigured) redirect("/");
  const items = await readOutbox();
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Dev outbox</h1>
        <p className="text-sm text-muted-foreground">Resend isn&apos;t configured. Every email the app sends lands here.</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing sent yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((m) => (
            <li key={m.file}>
              <Link href={`/dev/outbox/${encodeURIComponent(m.file)}`} className="block px-4 py-3 hover:bg-muted">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium">{m.subject}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(m.at).toLocaleString()}</span>
                </div>
                <div className="text-xs text-muted-foreground">to {m.to}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
