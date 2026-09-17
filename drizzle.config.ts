import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Forgive values pasted with a `KEY=` prefix, quotes, or whitespace; empty → unset.
function clean(key: string): string | undefined {
  let s = (process.env[key] ?? "").trim();
  if (s.startsWith(`${key}=`)) s = s.slice(key.length + 1).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1).trim();
  return s || undefined;
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: clean("DATABASE_DIRECT_URL") ?? clean("DATABASE_URL") ?? "postgres://localhost:5432/myshop",
  },
  strict: true,
  verbose: true,
});
