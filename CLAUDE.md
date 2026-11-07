# CLAUDE.md: Food Circle (working title)

Read this file first, every session. It is the contract for how you work on this repo.

## What we are building

A mobile-first website (installable PWA) where people see restaurant, cafe and street-food verdicts from people they actually know, labelled by relationship, instead of from random strangers. Mumbai first, India later.

Core promise in one sentence: "3 of your friends went. 2 said Go, 1 said Skip."

Pillars:
1. Verdicts: one-tap Go / Skip / Only for..., with optional depth one tap away.
2. Relationships: Friend (mutual), Following (one-way), Everyone. Every verdict is labelled with the author's relationship to the viewer.
3. Food diary: every visit is also a memory, private by default.
4. Exploration: friendly competition on unique places visited, plus Mumbai-flavoured badges.
5. Discover: find people with similar taste (Instagram-style), plus optional Groups (Family, College gang).

The builder is a solo student developer shipping a side project first, startup later. Keep things simple, boring and shippable.

## Docs (all in /docs). Read in this order when starting a phase

1. PRODUCT_SPEC.md      what the product is and the rules of the experience
2. PHASES.md            the build order, with checklists and "done when" criteria
3. ARCHITECTURE.md      stack, folder structure, patterns, env vars
4. DATABASE.md          schema, enums, functions (SQL)
5. SECURITY_PRIVACY.md  row-level security policies and moderation
6. PLACES_DATA.md       place identity, OSM seed, dedupe, merge, Swiggy/Zomato handoff
7. SCORING_BADGES.md    exploration score rules, recompute function, badges, streaks
8. API_SPEC.md          RPCs, server actions, routes
9. UI_UX.md             design tokens, components, screens, copy
10. TESTING.md          what must be tested and how
11. KICKOFF_PROMPT.md   prompts the human will paste; not for you to follow on your own

If two docs disagree, PRODUCT_SPEC.md wins on behaviour, DATABASE.md wins on schema. Tell the human about the conflict and record it in docs/DECISIONS.md.

## Stack (fixed unless the human changes it)

- Next.js (App Router) + TypeScript strict + Tailwind CSS, package manager pnpm
- Supabase: Postgres, PostGIS, pg_trgm, citext, Auth (Google OAuth first), Storage, Row Level Security
- MapLibre GL JS with OpenStreetMap-based tiles (never require a paid map key)
- Zod for validation, Vitest for unit tests, pgTAP via `supabase test db` for database tests, Playwright for smoke tests
- Hosting: Vercel (web) + Supabase (backend)

## Non-negotiable rules

1. Trust tiers are never blended. Friends, Following and Everyone are shown and counted separately. There is no combined average score anywhere.
2. The Visit is the scoring unit. Reviews, dishes, notes and photos never earn points. Scoring is computed by the database function in SCORING_BADGES.md and nowhere else.
3. Row Level Security is on for every table, and visibility (private / friends / followers / public) is enforced in Postgres, not only in the UI. Every policy has a test.
4. Places have our own internal UUIDs. Google or OSM ids are optional links, never primary keys.
5. The logging flow stays fast: the only required input is the verdict. Everything else is optional and skippable. Target: logged in under 10 seconds.
6. Mobile first. Design at 390px width, touch targets at least 44px, then scale up. Must work on slow mobile data: compress images client-side, avoid heavy bundles, lazy-load maps.
7. Never scrape Zomato or Swiggy. The handoff is a plain link and is hidden when we are not confident (see PLACES_DATA.md).
8. Do not store third-party content (for example Google Places details) beyond what its terms allow. Store only google_place_id. If unsure about any API's terms, pricing or limits, say so and ask the human to verify instead of guessing.
9. Secrets: the Supabase service-role key exists only in server code and scripts, never in client bundles, never committed.
10. Privacy defaults go to the narrower audience. Memories (photos, private notes, companions) default to private. Always show who can see an entry before it is posted.
11. Phase discipline: build only the current phase. Do not start the next phase until the human says so.

## Working agreement (how to run a phase)

1. Read the phase section in PHASES.md and the docs it points to.
2. Post a short plan (10 lines max). Ask questions only if something blocks you; otherwise state your assumptions and go.
3. Work task by task in small commits, in the order listed. Use conventional commit messages (feat:, fix:, chore:, test:, docs:).
4. After each task: tick its checkbox in PHASES.md, run `pnpm lint && pnpm typecheck && pnpm test`, and run `supabase test db` if the database changed.
5. Never edit an applied migration. Add a new one.
6. At the end of the phase: run the "Done when" scenario from PHASES.md step by step, report pass/fail for each step in plain language, list anything deferred, then stop and wait.
7. Record any decision that deviates from the docs, or any assumption you made, in docs/DECISIONS.md with a date and one-line reason.

## Conventions

- TypeScript strict, no `any`, no unchecked non-null assertions on external data.
- Validate every external input (forms, route params, RPC arguments) with Zod at the boundary.
- Server Components by default. Client Components only for interactivity (log sheet, map, toggles).
- Mutations via Server Actions that call Supabase with the user's session. Reads through typed RPCs or table queries that rely on RLS.
- Generate DB types with `pnpm db:types` after every migration. Do not hand-write DB types.
- All user-facing strings go in `lib/copy.ts` so Hinglish/i18n can be added later.
- Time: store UTC, treat the product day as Asia/Kolkata (IST). Money: whole INR integers.
- Accessibility: every control labelled, colour never the only signal (verdicts and relationship tags always carry text), focus states visible.
- Keep components small. Domain logic (tier ordering, visibility labels, copy for summaries) lives in `lib/domain` with unit tests.
- No new dependency without a one-line justification in docs/DECISIONS.md.

## Commands

```
pnpm dev                 start Next.js
pnpm build               production build
pnpm lint                eslint
pnpm typecheck           tsc --noEmit
pnpm test                vitest
pnpm test:e2e            playwright smoke tests
pnpm db:start            supabase start (local stack)
pnpm db:reset            supabase db reset (migrations + seed.sql)
pnpm db:test             supabase test db (pgTAP)
pnpm db:types            generate TypeScript types from the local DB
pnpm seed:osm            import Mumbai places and areas (idempotent)
```

Create these scripts in package.json during Phase 0 if they do not exist.

## Things to never do

- Do not build features from a later phase "while you are there".
- Do not add a global (Mumbai-wide) leaderboard. Boards are scoped to friends, groups, or followed people.
- Do not auto-create fake users, fake reviews or fake activity in production. Dev seed data only, clearly marked.
- Do not request device contacts or precise location without an explicit, optional user action.
- Do not write anything to the repo that looks like a secret.

## Out of scope for now

Native apps, delivery/ordering inside the app, payments, restaurant-owner accounts, ads, global rankings, AI recommendations. Monetisation is undecided. The product name is "SKOOP" (human decision, 2026-11-07; formerly the working title "Food Circle"); keep it in one config constant (`lib/config.ts`).
