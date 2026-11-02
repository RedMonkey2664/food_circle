# DECISIONS.md

Deviations from the docs, assumptions, and new dependencies. Newest at the bottom. Format: date, decision, one-line reason.

## 2026-11-02: Phase 0 kickoff

### Repo and tooling
- Repo: github.com/RedMonkey2664/food_circle (public). Default branch `main`; each phase on its own branch (`phase-0-foundations`), merged by the human after approval. Public repo means extra care: nothing secret-looking is ever committed.
- Specs moved from repo root into `docs/`; CLAUDE.md stays at root.
- Node 24 + pnpm. Supabase CLI as a project dev dependency, not a global install.
- Latest stable Next.js / Tailwind v4 / supabase-js, pinned. Where docs predate current conventions (e.g. Next.js `proxy.ts` vs `middleware.ts`, Supabase publishable/secret keys vs anon/service_role), follow current conventions; each case noted below when it happens.
- Migration files use Supabase timestamp prefixes, same order as DATABASE.md "Migration order".
- Repo currently lives inside OneDrive; recommended to move outside OneDrive to avoid sync locks on node_modules. Human decides.

### Phase 0 scope (phase discipline vs P0-03)
- Phase 0 ships: all tables and enums; security helpers; RLS + column grants; place functions (normalize_name, resolve_area, search_places, find_place_candidates); places/profiles triggers and the visit date-validation trigger; badge reference rows.
- Deferred to Phase 1 as new migrations: scoring functions + recompute trigger (P1-09), feed/summary/verdict RPCs, social-graph RPCs. Reason: P0-03 and P1-09 conflict; CLAUDE.md rule 11 wins.

### Fixes to the documented SQL (semantics kept, bugs removed)
- `group_members` / `groups` select policies use a `security definer` helper `is_group_member()`; the documented self-referencing policy causes infinite RLS recursion.
- `profiles`: column-level update grants so clients cannot change `is_admin`, `banned_at`, `onboarded_at`, `created_at`.
- Insert policies and write RPCs reject users with `banned_at` set (SECURITY_PRIVACY §8 says so; documented policies did not).
- `visit_companions` select follows memory visibility, not visit visibility (companions are part of the private memory layer).
- Owner-read policies added for `visit_audience_groups` and `invite_redemptions`.
- `handle_new_user` truncates Google display names to 60 chars so signup cannot fail.
- `visits.visited_on` defaults to the current IST date.
- `admin_audit.admin_id` and `reports.reviewed_by` get `on delete set null` so admin accounts can be deleted.
- Colour tokens adjusted for WCAG AA (4.5:1 small text): primary darkened from #D9480F (~4.3:1), go and onlyfor darkened. Exact values recorded when tokens land (P0-06).

### Product interpretations
- Invite link: `/invite/[code]` shows a one-tap confirm that calls a server action (no state-changing GET, ARCHITECTURE §13). The link is still the inviter's pre-consent.
- Google Places fallback: not built at all (PLACES_DATA §8 wins over P1-06).
- Anonymous visitors see nothing in Phase 0/1.
- Labels: tag text FRIEND / Following / Public; third summary row heading "Everyone".
- "Latest visit" per author = latest `visited_on`, then `logged_at`, everywhere.
- `[Everyone]` filter = all tiers, still separated.
- Scoring rules unchanged for now (including: over-cap first visits never score later). Revisit in Phase 6.
- Leaderboard counts leaking friends-only visits to non-friends (SECURITY_PRIVACY threat 5): open, to resolve in Phase 6.

### Data
- OSM via one Overpass query, raw JSON cached under gitignored `data/raw/`, descriptive User-Agent.
- Areas: fallback strategy (OSM place=suburb|neighbourhood centroids, nearest within 3 km). Polygons later if a licence-clean source is confirmed. Slugs listed here after load.
- ODbL share-alike implications of mixing OSM and user places: human to verify before launch.
- Map tile provider: not chosen; not needed until Phase 5.

### P0-01 (2026-11-02)
- Next.js 16.4 + React 19.3. Kept the template defaults `cacheComponents` and `partialPrefetching`: static shell + streamed per-user sections fit the slow-4G budget. Session reads must sit inside `<Suspense>`. Turn off if it fights Supabase SSR.
- Next 16 renamed `middleware.ts` to `proxy.ts`; session refresh will live in `proxy.ts`.
- `AGENTS.md` is written by `next dev` (points agents at version-matched docs in node_modules); committed so the tree stays clean.
- `typecheck` runs `next typegen` first (needed for the global `PageProps`/`LayoutProps` types).
- Supabase CLI pinned at v2.122 (v3 just released; staying on the well-documented major until there is a reason to move).
- TS stricter than the template: `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. ESLint: `no-explicit-any`, `no-non-null-assertion` as errors.
- Line endings: `.gitattributes` forces LF (SQL/shell scripts break with CRLF on Windows).

### Dependencies added (P0-01)
- `@supabase/supabase-js`, `@supabase/ssr`: the backend client and cookie-based auth for App Router (stack).
- `zod`: input validation at every boundary (CLAUDE.md).
- `server-only`: build-time guard that keeps server modules (service-role client) out of client bundles.
- `vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths`: unit tests with the `@/` alias.
- `@playwright/test`, `@axe-core/playwright`: mobile smoke tests and a11y checks (TESTING.md).
- `prettier`, `prettier-plugin-tailwindcss`: consistent formatting and class order.
- `supabase` (CLI): local stack, migrations, pgTAP, type generation.
- `tsx`, `dotenv`: run TypeScript scripts (OSM seed) with `.env.local`.
