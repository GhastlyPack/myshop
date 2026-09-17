import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { auth0Configured, resendConfigured, storageDriver, stripeConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Admin-only diagnostics. Never returns secrets, only which drivers are active,
 * a timed DB ping, and Postgres session/lock state so a stuck backend is visible.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "admin only" }, { status: 403 });

  const drivers = { auth0: auth0Configured, storage: storageDriver, resend: resendConfigured, stripe: stripeConfigured };
  const t0 = Date.now();
  const withTimeout = <T,>(p: Promise<T>, ms: number) =>
    Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`timed out after ${ms}ms`)), ms))]);

  let ping: { ok: boolean; ms: number; error?: string } = { ok: false, ms: 0 };
  let sessions: unknown = null;
  let blocked: unknown = null;
  try {
    await withTimeout(db.execute(sql`select 1`), 8000);
    ping = { ok: true, ms: Date.now() - t0 };
    sessions = Array.from(
      await withTimeout(
        db.execute(sql`
          select pid, state, wait_event_type, wait_event, usename, application_name,
                 now() - xact_start as xact_age, now() - query_start as query_age,
                 left(query, 160) as query
          from pg_stat_activity
          where datname = current_database() and pid <> pg_backend_pid() and state <> 'idle'
          order by xact_start nulls last
          limit 40`),
        8000,
      ),
    );
    blocked = Array.from(
      await withTimeout(
        db.execute(sql`
          select b.pid as blocked_pid, left(b.query, 120) as blocked_query,
                 unnest(pg_blocking_pids(b.pid)) as blocking_pid
          from pg_stat_activity b
          where cardinality(pg_blocking_pids(b.pid)) > 0
          limit 40`),
        8000,
      ),
    );
  } catch (e) {
    ping = { ok: false, ms: Date.now() - t0, error: (e as Error).message };
  }

  return NextResponse.json({ ok: ping.ok, drivers, ping, sessions, blocked, at: new Date().toISOString() });
}
