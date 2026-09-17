import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isProd, resendConfigured } from "@/lib/env";
import { readOutboxItem } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export default async function OutboxItem({ params }: { params: Promise<{ file: string }> }) {
  if (isProd || resendConfigured) redirect("/");
  const { file } = await params;
  const m = await readOutboxItem(decodeURIComponent(file));
  if (!m) notFound();
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-10">
      <Link href="/dev/outbox" className="text-sm text-muted-foreground hover:underline">
        ← Outbox
      </Link>
      <div className="rounded-lg border p-4 text-sm">
        <div>
          <span className="text-muted-foreground">From:</span> {m.from}
        </div>
        <div>
          <span className="text-muted-foreground">To:</span> {m.to}
        </div>
        <div>
          <span className="text-muted-foreground">Subject:</span> {m.subject}
        </div>
      </div>
      <iframe title="email" srcDoc={m.html} className="h-[70vh] w-full rounded-lg border bg-white" sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" />
    </main>
  );
}
