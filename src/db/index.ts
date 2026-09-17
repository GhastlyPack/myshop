import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/lib/env";

declare global {
  var __myshopSql: ReturnType<typeof postgres> | undefined;
}

// Reuse the connection across HMR reloads in dev; Vercel gets one per lambda.
const client =
  globalThis.__myshopSql ??
  postgres(env.DATABASE_URL, {
    // Serverless: one connection per function instance; the Supabase pooler multiplexes.
    max: env.NODE_ENV === "production" ? 1 : 10,
    prepare: false, // required for Supabase transaction pooler (port 6543)
    idle_timeout: env.NODE_ENV === "production" ? 5 : 20,
    max_lifetime: 60 * 5,
    connect_timeout: 10, // seconds; surface a dead pooler as an error instead of a hang
  });
if (env.NODE_ENV !== "production") globalThis.__myshopSql = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
export { schema };
