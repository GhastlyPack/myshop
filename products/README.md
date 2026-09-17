# Products (sources)

Source files for the store's own digital products. Nothing here is served directly; `scripts/import-products.ts` uploads the deliverables to storage and upserts the product rows.

```
products/
  cmo-seat-starter-kit/      free lead magnet
    CMO-Seat-Starter-Kit.pdf           built by build_pdfs.py
    skill/cmo-kickoff/                mini Claude skill (kickoff only)
    skill/cmo-kickoff.zip|.skill      zip of that folder (.skill = same zip, Claude.ai upload name)
  manual-1/             $39 bundle
    Manual-1-Replace-a-1M-Marketing-Team-with-ToMarket.pdf   the author's manual (source of truth)
    Manual-1-Toolkit.pdf          built by build_pdfs.py (install guide, worksheets, prompt pack)
    skill/cmo-seat/                    companion Claude skill (SKILL.md + references + assets)
    skill/cmo-seat.zip|.skill
  artwork/                   thumbnails (1000x1000) and banners (1600x900)
    raw-*.png                          GPT Image 2.5 base renders (no text)
    make_art.py                        text overlay / composition
  build_pdfs.py              reportlab builder for both PDFs
```

## Rebuild

```bash
python3 -m venv .venv && .venv/bin/pip install reportlab pillow      # once
.venv/bin/python products/build_pdfs.py                              # both PDFs
cd products/manual-1/skill && zip -qr cmo-seat.zip cmo-seat && cp cmo-seat.zip cmo-seat.skill
cd products/cmo-seat-starter-kit/skill && zip -qr cmo-kickoff.zip cmo-kickoff && cp cmo-kickoff.zip cmo-kickoff.skill
```

Re-zip whenever a skill file changes; the import script uploads the zips, not the folders.

## Import into a store

```bash
pnpm import:products --store <username>            # publish
pnpm import:products --store <username> --draft    # load as drafts to review in the dashboard first
```

Uses whatever storage driver the env points at (local `.data/`, Supabase Storage, or S3), so the same command works locally and against production with the production `.env`. Idempotent: product ids are fixed (`prd_c22_starter_kit`, `prd_c22_manual_1`), files are replaced on every run, and both land in a section called "22nd Century Marketing".

Product copy (title, subtitle, description, button, custom fields, confirmation email, DM keyword) lives in `scripts/import-products.ts` and can be edited there or in the dashboard after import (a re-run overwrites dashboard edits).
