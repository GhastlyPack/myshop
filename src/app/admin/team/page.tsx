import type { Metadata } from "next";
import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { adminInvites, users } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { ownerEmail } from "@/lib/env";
import { TeamForms } from "./team-forms";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const me = await requireAdmin();
  const [team, invites] = await Promise.all([
    db.select().from(users).where(inArray(users.role, ["owner", "admin"])).orderBy(desc(users.createdAt)),
    db.select().from(adminInvites).orderBy(desc(adminInvites.createdAt)),
  ]);
  const sorted = [...team].sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0));
  const isOwner = me.role === "owner";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who can open this admin area. The owner is set by the deployment ({ownerEmail || "not set"}) and can&apos;t be removed here.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Add an admin</h2>
        <TeamForms mode="add" />
        <p className="text-xs text-muted-foreground">If they haven&apos;t signed in yet, access is applied the first time they do.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Admins</h2>
        <div className="divide-y rounded-xl border bg-background">
          {sorted.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{u.name ?? u.email}</div>
                <div className="truncate text-xs text-muted-foreground">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={u.role === "owner" ? "default" : "secondary"}>{u.role}</Badge>
                {isOwner && u.role !== "owner" && <TeamForms mode="remove" email={u.email} />}
              </div>
            </div>
          ))}
          {invites.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{i.email}</div>
                <div className="text-xs text-muted-foreground">Invited · applies on first sign-in</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">pending</Badge>
                {isOwner && <TeamForms mode="remove" email={i.email} />}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
