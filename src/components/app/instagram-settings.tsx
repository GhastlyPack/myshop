import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { instagramAccounts, instagramReplies } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalTime } from "@/components/local-time";
import { instagramConfigured } from "@/lib/env";
import { instagramBetaState } from "@/lib/instagram-beta";
import { InstagramBetaApply } from "./instagram-beta-apply";
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

  if (!acct) {
    const beta = await instagramBetaState(storeId);
    const canConnect = beta.access === "open" || beta.access === "approved";
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <InstagramIcon className="size-4" /> Instagram auto-replies
            {beta.access !== "open" && <Badge variant="secondary">Beta</Badge>}
          </CardTitle>
          <CardDescription>
            Connect your Business or Creator account. When someone comments or DMs a product&apos;s keyword, they get the link by DM within seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">{decodeURIComponent(error) === "beta" ? "Your beta access is still pending." : `Couldn't connect: ${decodeURIComponent(error)}`}</p>}
          {canConnect ? (
            <>
              {beta.access === "approved" && <p className="text-sm text-muted-foreground">You&apos;re approved for the beta. Connect your account to switch it on.</p>}
              <Button asChild>
                <a href="/api/instagram/connect">Connect Instagram</a>
              </Button>
            </>
          ) : beta.access === "pending" ? (
            <p className="text-sm text-muted-foreground">Application received for <span className="font-medium">@{beta.username}</span>. We&apos;ll email you when you&apos;re approved, usually within a day.</p>
          ) : beta.access === "denied" ? (
            <p className="text-sm text-muted-foreground">Your beta application wasn&apos;t approved. Reply to your welcome email if you think that&apos;s a mistake.</p>
          ) : (
            <InstagramBetaApply />
          )}
        </CardContent>
      </Card>
    );
  }

  const [stats] = await db
    .select({ sent: sql<number>`count(*) filter (where ${instagramReplies.ok})::int`, failed: sql<number>`count(*) filter (where not ${instagramReplies.ok})::int` })
    .from(instagramReplies)
    .where(and(eq(instagramReplies.storeId, storeId), sql`${instagramReplies.createdAt} > now() - interval '30 days'`));
  const recent = await db.select().from(instagramReplies).where(eq(instagramReplies.storeId, storeId)).orderBy(desc(instagramReplies.createdAt)).limit(5);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <InstagramIcon className="size-4" /> @{acct.username}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant={acct.active ? "default" : "secondary"}>{acct.active ? "Replies on" : "Paused"}</Badge>
            <Badge variant="secondary">{stats.sent} sent in 30 days</Badge>
            {stats.failed > 0 && <Badge variant="destructive">{stats.failed} failed</Badge>}
          </div>
        </div>
        <CardDescription>
          Comment or DM a product&apos;s keyword and the sender gets that product&apos;s auto-reply. Set the keyword and message on each product under Options.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">Couldn&apos;t connect: {decodeURIComponent(error)}</p>}
        <InstagramControls publicReply={acct.publicReply} active={acct.active} />
        {recent.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Recent replies</div>
            <ul className="divide-y rounded-lg border text-sm">
              {recent.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2">
                  <span className="min-w-0 truncate">
                    <span className="font-mono text-xs uppercase">{r.keyword}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {r.kind === "comment" ? "comment" : "DM"} from {r.fromUsername ? `@${r.fromUsername}` : "someone"}
                    </span>
                  </span>
                  <span className={`text-xs ${r.ok ? "text-muted-foreground" : "text-destructive"}`}>
                    {r.ok ? <LocalTime date={r.createdAt} /> : (r.error ?? "failed").slice(0, 60)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Connection renews itself; nothing to do unless you change your Instagram password.</p>
      </CardContent>
    </Card>
  );
}
