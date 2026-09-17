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
    max: env.NODE_ENV === "production" ? 5 : 10,
    prepare: false, // required for Supabase transaction pooler (port 6543)
    idle_timeout: 20,
  });
if (env.NODE_ENV !== "production") globalThis.__myshopSql = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
export { schema };
