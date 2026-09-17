import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, inArray } from "drizzle-orm";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db } from "@/db";
import { productFiles, productLinks, products, sections, stores } from "@/db/schema";
import type { CustomField } from "@/db/schema";

/**
 * Loads the 22nd Century Marketing products (sources under products/) into a store:
 *   pnpm exec tsx scripts/import-products.ts --store <username> [--draft]
 * Idempotent: products are upserted by fixed ids, files are replaced. Works with the
 * same storage driver the app uses (local .data/, Supabase Storage, or S3), read from env.
 */
const args = process.argv.slice(2);
const username = args[args.indexOf("--store") + 1];
const draft = args.includes("--draft");
if (!username || username.startsWith("--")) {
  console.error("usage: tsx scripts/import-products.ts --store <username> [--draft]");
  process.exit(1);
}

const ROOT = path.join(process.cwd(), "products");
const clean = (v?: string) => (v ?? "").trim().replace(/^[A-Z0-9_]+=/, "").replace(/^["']|["']$/g, "").trim() || undefined;
const env = {
  SUPABASE_URL: clean(process.env.SUPABASE_URL),
  SUPABASE_SERVICE_ROLE_KEY: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  AWS_ACCESS_KEY_ID: clean(process.env.AWS_ACCESS_KEY_ID),
  AWS_SECRET_ACCESS_KEY: clean(process.env.AWS_SECRET_ACCESS_KEY),
  AWS_REGION: clean(process.env.AWS_REGION) ?? "us-east-1",
  S3_BUCKET_FILES: clean(process.env.S3_BUCKET_FILES),
  S3_BUCKET_PUBLIC: clean(process.env.S3_BUCKET_PUBLIC),
};
const driver = env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET_FILES && env.S3_BUCKET_PUBLIC ? "s3" : env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local";

type Bucket = "files" | "public";
const s3 = driver === "s3" ? new S3Client({ region: env.AWS_REGION, credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID!, secretAccessKey: env.AWS_SECRET_ACCESS_KEY! } }) : null;
let sbReady = false;
async function put(bucket: Bucket, key: string, body: Buffer, contentType: string) {
  if (s3) {
    await s3.send(new PutObjectCommand({ Bucket: bucket === "files" ? env.S3_BUCKET_FILES : env.S3_BUCKET_PUBLIC, Key: key, Body: body, ContentType: contentType }));
    return;
  }
  if (driver === "supabase") {
    const base = `${env.SUPABASE_URL!.replace(/\/$/, "")}/storage/v1`;
    const headers = { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY! };
    if (!sbReady) {
      for (const b of ["files", "public"] as const) {
        const r = await fetch(`${base}/bucket`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ id: b, name: b, public: b === "public" }) });
        if (!r.ok && r.status !== 409) throw new Error(`bucket ${b}: ${r.status} ${await r.text()}`);
      }
      sbReady = true;
    }
    const enc = key.split("/").map(encodeURIComponent).join("/");
    const r = await fetch(`${base}/object/${bucket}/${enc}`, { method: "POST", headers: { ...headers, "Content-Type": contentType, "x-upsert": "true" }, body: new Uint8Array(body) });
    if (!r.ok) throw new Error(`upload ${key}: ${r.status} ${await r.text()}`);
    return;
  }
  const full = path.join(process.cwd(), ".data", bucket, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
}

type File = { id: string; src: string; filename: string; mime: string };
type Product = {
  id: string; slug: string; title: string; subtitle: string; description: string; priceCents: number;
  cardStyle: "button" | "callout" | "preview"; buttonText: string; thumb: string; banner: string;
  files: File[]; fields: CustomField[]; marketingOptIn: boolean; dmKeyword: string;
  confirmationSubject: string; confirmationBody: string; position: number;
};

const SECTION = { id: "sec_c22_marketing", title: "22nd Century Marketing", position: 0 };
const PRODUCTS: Product[] = [
  {
    id: "prd_c22_starter_kit",
    slug: "cmo-seat-starter-kit",
    title: "The CMO Seat Starter Kit",
    subtitle: "Free. The cost table, the kickoff script, the three numbers, and the benchmark sheet, plus a Claude skill that runs the kickoff for you.",
    description: `## Sit in the CMO seat for ten minutes before you spend a dollar on ads

Software now does six of the seven jobs in an ad department. The seventh seat, the one that decides what to sell, to whom, and whether it's working, is yours. This free kit is the first ten pages of that seat.

### What's inside

1. **The team you're about to replace.** What a seven-seat ad department really costs (about $1M a year loaded) and which six seats software now fills.
2. **The kickoff script, word for word.** The eight questions a real chief marketing officer asks before touching the software, plus the access checklist.
3. **The three numbers.** Break-even ROAS, maximum affordable cost per lead, and a starting daily budget, with the formulas and a worked example.
4. **The benchmark sheet.** Every metric defined in one line, and 2025–2026 medians for dentists, med spas, HVAC, roofers, restaurants, gyms, law firms, real estate, and auto repair.
5. **A Claude skill (\`cmo-kickoff\`)** that interviews you, does the math, and hands back the filled-in worksheet. A copy-paste prompt is included if you'd rather use ChatGPT.

### Who it's for

- Local business owners who want to run their own ads with AI tools
- Freelancers and agency operators taking on their first client
- Anyone who has been burned by "just boost the post"

> Advertising isn't hard to get good at. It's expensive to get good at. You just skipped the expensive part. Don't skip the judgment part.

**Free, instant, no strings.** Drop your email and it's in your inbox in under a minute. It's the first step of Manual 1.`,
    priceCents: 0,
    cardStyle: "callout",
    buttonText: "Send me the kit",
    thumb: "artwork/free-thumb.png",
    banner: "artwork/free-banner.png",
    files: [
      { id: "pfl_c22_kit_pdf", src: "cmo-seat-starter-kit/CMO-Seat-Starter-Kit.pdf", filename: "CMO-Seat-Starter-Kit.pdf", mime: "application/pdf" },
      { id: "pfl_c22_kit_skill", src: "cmo-seat-starter-kit/skill/cmo-kickoff.zip", filename: "cmo-kickoff-claude-skill.zip", mime: "application/zip" },
      { id: "pfl_c22_kit_skillfile", src: "cmo-seat-starter-kit/skill/cmo-kickoff.skill", filename: "cmo-kickoff.skill", mime: "application/zip" },
    ],
    fields: [
      { id: "fld_role", label: "Which best describes you?", type: "select", required: false, options: ["I run a local business", "I run ads for clients", "I'm thinking about starting an agency", "Just curious"] },
    ],
    marketingOptIn: true,
    dmKeyword: "CMO",
    confirmationSubject: "Your CMO Seat Starter Kit, {{name}}",
    confirmationBody: `Hey {{name}}, here's your {{product}}.

Read it once, then run the kickoff on your own business or your first client before you open any ad software. The three numbers on page 4 decide whether ads can work at all.

The zip inside is a small Claude skill. Install it and say "run the kickoff for my [niche] client" and it does the interview and the math with you.

When you want the rest of the seat (the offer, the creative standard, Google, launch, the dashboard, troubleshooting, the weekly report), Manual 1 is $39 in the same store.

Reply to this email if you get stuck.

- {{store}}`,
    position: 0,
  },
  {
    id: "prd_c22_manual_1",
    slug: "manual-1",
    title: "Replace a $1M Marketing Team with One AI Tool (Manual 1)",
    subtitle: "The 20-page 22nd Century Marketing manual, the cmo-seat Claude skill, the worksheets, and the prompt pack. Direct response ads for local businesses, fulfilled with ToMarket.io.",
    description: `## An ad department is seven seats and about a million dollars a year

Software now does six of them. It draws, writes, edits, shoots, and buys. The seventh seat, the CMO who decides what to sell, to whom, at what offer, and whether it's working, is the one no tool fills. **Manual 1 is the training for that seat.**

I've paid for that whole table more than once, built a lead-gen company from $2,000 a week to $108,000 a week, and still spend six figures a month on my own ads. Everything those people knew how to do is now inside the software. What they couldn't do is the judgment. That's what's in here.

### What you get

**1. The manual** (20 pages, 20 sections)

- **Part A. The seats.** What each person did all day, and what does it now.
- **Part B. Before you launch.** The kickoff, setting expectations in writing, speed-to-lead, setting up the department.
- **Part C. Directing the creative team you no longer have.** The offer (value equation, lead-gen vs direct sale, templates by niche), who the ads talk to, the research writers used to do, the opening-frame standard, the copy checklist, approved vs sent back, the Google side, launch.
- **Part D. Managing the media buyer who never sleeps.** What the rules engine does daily, what you test by hand and in what order, reading the dashboard against real benchmarks, troubleshooting by symptom.
- **Part E. Running the department.** The weekly report, the monthly ROI sentence that renews a contract, running several businesses at once, the operator's math, mistakes that get a CMO fired, the niche quick-reference.

**2. The \`cmo-seat\` Claude skill**

The whole seat as a skill. Install it in Claude and it will:

- Run the kickoff interview and compute break-even ROAS, target cost per lead, and a starting budget
- Write the expectations letter
- Build the offer and the creative brief
- Review creatives with approve / send back verdicts and rewrites
- Write Google responsive search ads with coverage rules
- Walk the launch checklist
- Read the dashboard, troubleshoot by symptom, and write the weekly report and ROI math

Works in Claude.ai, Claude Code, and Cowork.

**3. The toolkit PDF** (14 pages)

Install guide, fill-in worksheets and templates for every step (kickoff, expectations letter, offer brief, copy checklist, setup and pre-launch checklists, weekly report), the operator's weekly schedule, and a nine-prompt pack for anyone who won't install a skill.

### Who it's for

- Owners who want to run their own ads and know when to trust the software
- Operators who want to run marketing for five to ten local businesses from one seat
- Anyone paying an agency and wondering what they're actually paying for

> Six of the seven seats at that table are now software. The seventh is you.

Built around ToMarket.io; the judgment applies to any AI ad tool. **One-time purchase. Instant download. Future updates to Manual 1 are free.**`,
    priceCents: 3900,
    cardStyle: "preview",
    buttonText: "Get Manual 1",
    thumb: "artwork/paid-thumb.png",
    banner: "artwork/paid-banner.png",
    files: [
      { id: "pfl_c22_m1_manual", src: "manual-1/Manual-1-Replace-a-1M-Marketing-Team-with-ToMarket.pdf", filename: "Manual-1-Replace-a-1M-Marketing-Team-with-ToMarket.pdf", mime: "application/pdf" },
      { id: "pfl_c22_m1_toolkit", src: "manual-1/Manual-1-Toolkit.pdf", filename: "Manual-1-Toolkit.pdf", mime: "application/pdf" },
      { id: "pfl_c22_m1_skill", src: "manual-1/skill/cmo-seat.zip", filename: "cmo-seat-claude-skill.zip", mime: "application/zip" },
      { id: "pfl_c22_m1_skillfile", src: "manual-1/skill/cmo-seat.skill", filename: "cmo-seat.skill", mime: "application/zip" },
    ],
    fields: [],
    marketingOptIn: true,
    dmKeyword: "MANUAL",
    confirmationSubject: "Manual 1 is yours, {{name}}. Start with the kickoff.",
    confirmationBody: `Hey {{name}}, thanks for buying {{product}}.

Your download has four files: the manual, the toolkit, and the cmo-seat Claude skill (as a .zip and as a .skill file).

The order that works:
1. Read the manual once, front to back. About an hour. Don't skip Part B.
2. Install the skill (page 2 of the toolkit shows how) and run the kickoff on your own business or your first client.
3. Keep the toolkit open while you work.

Reply to this email with what you're running ads for and I'll tell you which section to reread.

- {{store}}`,
    position: 1,
  },
];

const MIME: Record<string, string> = { ".png": "image/png", ".pdf": "application/pdf", ".zip": "application/zip", ".skill": "application/zip" };

async function main() {
  const store = await db.query.stores.findFirst({ where: eq(stores.username, username) });
  if (!store) throw new Error(`no store with username "${username}"`);
  console.log(`importing into @${store.username} (${store.id}) via ${driver} storage${draft ? " as drafts" : ""}`);

  // Earlier runs used 22nd Century Marketing-branded ids; drop them so the rebrand doesn't leave duplicates.
  await db.delete(products).where(inArray(products.id, ["prd_aima_starter_kit", "prd_aima_manual_1"]));
  await db.delete(sections).where(eq(sections.id, "sec_aima_method"));

  await db.insert(sections).values({ ...SECTION, storeId: store.id }).onConflictDoUpdate({ target: sections.id, set: { storeId: store.id, title: SECTION.title, position: SECTION.position } });

  for (const p of PRODUCTS) {
    const thumbKey = `${store.id}/thumb/${p.id}-thumb.png`;
    const bannerKey = `${store.id}/thumb/${p.id}-banner.png`;
    await put("public", thumbKey, await readFile(path.join(ROOT, p.thumb)), "image/png");
    await put("public", bannerKey, await readFile(path.join(ROOT, p.banner)), "image/png");
    const values = {
      storeId: store.id,
      sectionId: SECTION.id,
      slug: p.slug,
      type: "download" as const,
      title: p.title,
      subtitle: p.subtitle,
      description: p.description,
      thumbnailKey: thumbKey,
      bannerKey,
      cardStyle: p.cardStyle,
      buttonText: p.buttonText,
      priceCents: p.priceCents,
      currency: store.currency ?? "usd",
      listed: true,
      fields: p.fields,
      marketingOptIn: p.marketingOptIn,
      dmKeyword: p.dmKeyword,
      confirmationSubject: p.confirmationSubject,
      confirmationBody: p.confirmationBody,
      status: (draft ? "draft" : "published") as "draft" | "published",
      position: p.position,
    };
    await db.insert(products).values({ id: p.id, ...values }).onConflictDoUpdate({ target: products.id, set: values });
    await db.delete(productFiles).where(eq(productFiles.productId, p.id));
    await db.delete(productLinks).where(eq(productLinks.productId, p.id));
    for (const [i, f] of p.files.entries()) {
      const body = await readFile(path.join(ROOT, f.src));
      const key = `${store.id}/product/${p.id}/${f.filename}`;
      await put("files", key, body, MIME[path.extname(f.src)] ?? f.mime);
      await db.insert(productFiles).values({ id: f.id, productId: p.id, storageKey: key, filename: f.filename, bytes: body.length, mime: f.mime, position: i });
      console.log(`  ${p.slug}: ${f.filename} (${(body.length / 1024).toFixed(0)} KB)`);
    }
  }
  // Local dev server caches storefront pages for 5 minutes; ask it to drop this store's cache.
  const base = (process.env.APP_BASE_URL ?? "http://localhost:3000").trim();
  await fetch(`${base}/api/dev/revalidate?store=${encodeURIComponent(store.username)}`, { method: "POST" })
    .then((r) => console.log(r.ok ? "storefront cache cleared" : "cache not cleared (dev server not running?)"))
    .catch(() => console.log("cache not cleared (dev server not running?)"));
  console.log(`done → /${store.username}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
