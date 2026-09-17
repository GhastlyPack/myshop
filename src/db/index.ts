import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/lib/env";

/**
 * Postgres client for a serverless runtime.
 *
 * Vercel freezes a function instance between bursts of requests. While frozen, the
 * pooler closes our idle TCP socket, but the client object survives the thaw and
 * would try to reuse the dead socket, hanging until the platform kills the request.
 * So: any request that arrives after an idle gap discards the old client and opens a
 * fresh connection (≈50 ms through the Supabase pooler). One connection per instance;
 * the pooler multiplexes.
 */
const STALE_MS = env.NODE_ENV === "production" ? 15_000 : 5 * 60_000;

type Client = ReturnType<typeof postgres>;
type Db = ReturnType<typeof drizzle<typeof schema>>;

function makeClient(): Client {
  return postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "production" ? 1 : 10,
    prepare: false, // required for Supabase transaction pooler (port 6543)
    idle_timeout: env.NODE_ENV === "production" ? 10 : 20,
    max_lifetime: 60 * 5,
    connect_timeout: 10,
  });
}

declare global {
  var __myshopDb: { client: Client; db: Db; lastUsed: number } | undefined;
}

function state() {
  if (!globalThis.__myshopDb) {
    const client = makeClient();
    globalThis.__myshopDb = { client, db: drizzle(client, { schema }), lastUsed: Date.now() };
  }
  return globalThis.__myshopDb;
}

function current(): Db {
  const s = state();
  const now = Date.now();
  if (now - s.lastUsed > STALE_MS) {
    const old = s.client;
    s.client = makeClient();
    s.db = drizzle(s.client, { schema });
    void old.end({ timeout: 1 }).catch(() => {});
  }
  s.lastUsed = now;
  return s.db;
}

/** Drizzle instance; every access goes through the staleness check above. */
export const db: Db = new Proxy({} as Db, {
  get(_t, prop) {
    const target = current();
    const v = Reflect.get(target, prop, target);
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(target) : v;
  },
});
export type { Db };
export { schema };
