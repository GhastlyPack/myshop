import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { instagramAccounts, instagramReplies } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { instagramConfigured } from "@/lib/env";
import { InstagramControls } from "./instagram-controls";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Settings → Instagram. Connect the creator's professional account so keyword
 * comments and DMs get an automatic reply with the product link.
 */
export async function InstagramSettings({ storeId, error }: { storeId: string; error?: string | null }) {
  if (!instagramConfigured) {
    return (
      <Card className="border-dashed bg-muted/40">
        <CardHeader>
          <CardTitle className="text-base">Instagram auto-replies</CardTitle>
          <CardDescription>Not enabled on this deployment yet. Set a DM keyword on each product now and replies switch on automatically later.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  const acct = await db.query.instagramAccounts.findFirst({ where: eq(instagramAccounts.storeId, storeId) });
  const [stats] = acct
    ? await db
        .select({ sent: sql<number>`count(*) filter (where ${instagramReplies.ok})::int`, failed: sql<number>`count(*) filter (where not ${instagramReplies.ok})::int` })
        .from(instagramReplies)
        .where(and(eq(instagramReplies.storeId, storeId), sql`${instagramReplies.createdAt} > now() - interval '30 days'`))
    : [{ sent: 0, failed: 0 }];
  const recent = acct
    ? await db.select().from(instagramReplies).where(eq(instagramReplies.storeId, storeId)).orderBy(desc(instagramReplies.createdAt)).limit(5)
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <InstagramIcon className="size-4" /> Instagram auto-replies
            </CardTitle>
            <CardDescription>
              {acct
                ? `Connected as @${acct.username}. When someone comments or DMs a product's keyword, they get the link by DM.`
                : "Connect your professional Instagram account. When someone comments or DMs a product's keyword, they get the link by DM."}
            </CardDescription>
          </div>
          {acct ? (
            <InstagramControls connected publicReply={acct.publicReply} active={acct.active} />
          ) : (
            <Button asChild>
              <a href="/api/instagram/connect">Connect Instagram</a>
            </Button>
          )}
        </div>
      </CardHeader>
      {(error || acct) && (
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">Couldn&apos;t connect: {decodeURIComponent(error)}</p>}
          {acct && (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant={acct.active ? "default" : "secondary"}>{acct.active ? "Replies on" : "Paused"}</Badge>
                <Badge variant="secondary">{stats.sent} sent · 30d</Badge>
                {stats.failed > 0 && <Badge variant="destructive">{stats.failed} failed</Badge>}
                <Badge variant="outline">Token renews {acct.tokenExpiresAt.toLocaleDateString()}</Badge>
              </div>
              {recent.length > 0 && (
                <ul className="divide-y rounded-lg border text-sm">
                  {recent.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <span className="text-muted-foreground">
                        {r.kind === "comment" ? "Comment" : "DM"} from {r.fromUsername ? `@${r.fromUsername}` : "someone"} · <span className="font-mono uppercase">{r.keyword}</span>
                      </span>
                      <span className={r.ok ? "text-muted-foreground" : "text-destructive"}>{r.ok ? "replied" : (r.error ?? "failed").slice(0, 60)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Only products with a DM keyword reply. Set one on each product under Options. Replies work for Business and Creator accounts.
              </p>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
