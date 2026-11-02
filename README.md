# Food Circle (working title)

Restaurant, cafe and street-food verdicts from people you actually know. Mumbai first.

Specs live in [`docs/`](docs/). Start with [`CLAUDE.md`](CLAUDE.md), then `docs/PRODUCT_SPEC.md` and `docs/PHASES.md`.

## Prerequisites

- Node.js 20.9+ (developed on 24) and pnpm
- Docker Desktop running (the local Supabase stack runs in Docker)
- Git

The Supabase CLI is a dev dependency; use it via `pnpm exec supabase …` or the `db:*` scripts.

## Setup

```bash
pnpm install
cp .env.example .env.local     # then fill in values (see comments in the file)
pnpm db:start                  # local Postgres, Auth, Storage; prints local keys
pnpm db:reset                  # apply migrations + dev seed
pnpm db:types                  # regenerate lib/supabase/database.types.ts
pnpm dev                       # http://localhost:3000
```

## Commands

| Command          | What it does                                         |
| ---------------- | ---------------------------------------------------- |
| `pnpm dev`       | Next.js dev server                                   |
| `pnpm build`     | Production build                                     |
| `pnpm lint`      | ESLint                                               |
| `pnpm typecheck` | `tsc --noEmit`                                       |
| `pnpm test`      | Vitest unit tests                                    |
| `pnpm test:e2e`  | Playwright smoke tests (390px mobile viewport)       |
| `pnpm db:start`  | Start local Supabase                                 |
| `pnpm db:reset`  | Re-apply migrations and `supabase/seed.sql`          |
| `pnpm db:test`   | pgTAP database tests                                 |
| `pnpm db:types`  | Generate TypeScript types from the local database    |
| `pnpm seed:osm`  | Import Mumbai places and areas from OSM (idempotent) |

## Rules worth repeating

- Never commit secrets. `.env*.local` is gitignored; the service-role key is server/scripts only.
- Never edit an applied migration; add a new one.
- Map data © OpenStreetMap contributors (ODbL).
