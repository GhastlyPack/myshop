import type { Metadata } from "next";
import { ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { listStores } from "../queries";

export const metadata: Metadata = { title: "Stores" };
export const dynamic = "force-dynamic";

const num = (n: number) => n.toLocaleString("en-US");
const when = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function AdminStores({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const rows = await listStores(q);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stores</h1>
          <p className="text-sm text-muted-foreground">
            {num(rows.length)} {q ? `matching "${q}"` : "most recent"}. Read-only.
          </p>
        </div>
        <form action="/admin/stores" className="flex w-full items-center gap-2 sm:w-auto">
          <Input name="q" defaultValue={q} placeholder="Username, name or email" className="sm:w-64" aria-label="Search stores" />
          <Button type="submit" variant="outline" size="icon" aria-label="Search">
            <Search />
          </Button>
        </form>
      </div>

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Store</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="pl-4 text-muted-foreground">
                    No stores match.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="pl-4">
                    <div className="font-medium">{s.displayName}</div>
                    <a href={`/${s.username}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
                      /{s.username} <ExternalLink className="size-3" />
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.ownerEmail}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(s.products)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(s.orders)}</TableCell>
                  <TableCell>{s.published ? <Badge variant="outline">Published</Badge> : <Badge variant="secondary">Unpublished</Badge>}</TableCell>
                  <TableCell className="pr-4 text-right text-muted-foreground">{when(s.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
