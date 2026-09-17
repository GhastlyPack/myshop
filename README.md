# visitmy.shop

Sell digital products straight from your Instagram bio. A better Stan.store.

- Public store: `visitmy.shop/[username]`
- Docs: `docs/01-stan-research.md`, `docs/02-gap-analysis.md`, `docs/03-build-plan.md`, `docs/04-contracts.md`

## Local dev

```bash
createdb myshop            # Postgres 16+ running locally
cp .env.example .env.local # defaults work with zero external keys
pnpm install
pnpm db:migrate
pnpm dev
```

Then open http://localhost:3000, click **Claim your link** → dev sign-in (any email).
With no keys set: auth is a dev bypass, files live in `.data/`, emails land at `/dev/outbox`.

Seed a demo store: `pnpm seed` (after Package B lands).

## Scripts
`pnpm dev` · `pnpm build` · `pnpm typecheck` · `pnpm lint` · `pnpm db:generate` · `pnpm db:migrate` · `pnpm db:studio`
