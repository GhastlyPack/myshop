// Runs pending Drizzle migrations when a database is configured; skips otherwise.
// Used by `pnpm build` so Vercel applies schema changes before `next build`.
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] no DATABASE_URL set; skipping migrations");
  process.exit(0);
}
const host = (() => { try { return new URL(url).host; } catch { return "?"; } })();
console.log(`[migrate] applying migrations to ${host}`);
const r = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], { stdio: "inherit", env: process.env });
process.exit(r.status ?? 1);
