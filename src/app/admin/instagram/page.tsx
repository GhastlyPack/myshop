import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { instagramBetaRequests, stores } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LocalTime } from "@/components/local-time";
import { requireAdmin } from "@/lib/auth";
import { instagramPublic } from "@/lib/env";
import { StatusButtons } from "./status-buttons";

export const metadata: Metadata = { title: "Instagram beta" };
export const dynamic = "force-dynamic";

export default async function InstagramBetaAdmin() {
  await requireAdmin();
  const rows = await db
    .select({
      id: instagramBetaRequests.id,
      username: instagramBetaRequests.igUsername,
      status: instagramBetaRequests.status,
      createdAt: instagramBetaRequests.createdAt,
      storeUsername: stores.username,
    })
    .from(instagramBetaRequests)
    .innerJoin(stores, eq(stores.id, instagramBetaRequests.storeId))
    .orderBy(desc(instagramBetaRequests.createdAt));

  const badge = (s: string): "default" | "destructive" | "secondary" => (s === "approved" ? "default" : s === "denied" ? "destructive" : "secondary");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Instagram beta</h1>
        <p className="text-sm text-muted-foreground">
          Add an applicant&apos;s handle as a tester in the Meta app (Roles → Instagram Testers), then Approve. {instagramPublic ? "The app is public, so approval is no longer required." : "The app is in beta, so only approved testers can connect."}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No applications yet.</p>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Instagram</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-4 font-medium">
                    <a href={`https://instagram.com/${r.username}`} target="_blank" rel="noreferrer" className="hover:underline">
                      @{r.username}
                    </a>
                  </TableCell>
                  <TableCell>
                    <a href={`/${r.storeUsername}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline">
                      /{r.storeUsername}
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <LocalTime date={r.createdAt} mode="date" />
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="pr-4">
                    <StatusButtons id={r.id} status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
