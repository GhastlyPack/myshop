import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <Link href="/" className="inline-flex">
        <Wordmark size={20} />
      </Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated {updated}</p>
      <div className="prose prose-neutral mt-8 max-w-none text-[15px] leading-relaxed [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:mt-3 [&_a]:underline">{children}</div>
    </main>
  );
}
