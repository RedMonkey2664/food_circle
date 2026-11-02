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

### P0-02 to P0-04 (2026-11-02)
- Security helpers (`are_friends`, `is_following`, `is_blocked_between`, `is_admin`, `relationship_tier`, `can_view_visit`, plus new `is_active_user`, `is_group_member`, `can_view_memory`) and internal functions (`resolve_area`, trigger functions) live in schema `private`, not `public`. Reason: `public` is exposed by the Data API, so any signed-in user could call e.g. `are_friends(x, y)` or `is_blocked_between(x, y)` and probe other people's relationships. RLS policies still use them.
- Migration layout differs slightly from DATABASE.md: 0008 security helpers, 0009 place functions, 0010 triggers, 0011 badge rows, 0012 RLS. Scoring (0010 in the docs) and feed functions (0011 in the docs) come as new migrations in Phase 1.
- Deny-by-default grants: anon has no table access; `authenticated` gets SELECT (RLS filters rows) plus explicit column-level writes. Default privileges for future tables/functions are revoked, so every new table/RPC must grant explicitly.
- `profiles.onboarded_at` is not client-writable; onboarding completion will be an RPC (Phase 1).
- Extra integrity checks beyond the docs: diet/occasion arrays limited to known values; `merged_into` set iff status is merged; friendship `accepted_at` set iff accepted; invite `group_id` set iff kind is group; invite code format `[A-Za-z0-9_-]{22,}`.
- OSM places will be seeded with status `confirmed` (they come from a curated source); the unverified -> confirmed flow is for user pin-drops.
- Badges: Phase 6 set inserted active, Phase 7 set inserted inactive (no evaluator exists yet).
- pgTAP: 78 assertions across 7 files. Mutation check done: opening `visits_select` to `using (true)` made 8 assertions fail, then reset.

### P0-05, P0-06, P0-08 (2026-11-02)
- Auth: Google OAuth via a server action (`signInWithOAuth` + redirect), PKCE code exchange at `/auth/callback`, session refresh and optimistic redirect in `proxy.ts`, real check in the `(app)` layout via `getClaims()`. `next` redirect targets are validated (no open redirects). Onboarding redirect waits for Phase 1 (P1-01).
- Design tokens (UI_UX.md values, contrast-adjusted for WCAG AA small text): primary #C2410C (was #D9480F, ~4.3:1 -> ~5.2:1), go #15803D (was #1E8E4E, ~4.2:1 -> ~5.0:1), onlyfor #A16207 (was #B7791F, ~3.6:1 -> ~4.9:1). Skip #C92A2A kept (~5.4:1). Focus ring #1D4ED8.
- Fonts: Inter (UI) + Fraunces (display) via next/font, self-hosted at build time, variable fonts, no runtime request to Google.
- Icons are inline SVG (no icon library). No animation library: only a 150 ms press scale, disabled under prefers-reduced-motion.
- Diet badges use India's vegetarian mark (green dot in a square) for pure veg, veg-friendly and Jain.
- BottomNav shows Home, Log, Me only; Discover (Phase 2) and Diary (Phase 5) slots are added in their phases. Log and Me routes are Phase 1.
- `/dev/components` gallery is dev-only (404 in production; proxy skips the session check for /dev/ in development only).
- Supabase keys: publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) and secret key (`SUPABASE_SECRET_KEY`) replace the docs' anon/service_role names.
- Base CSS lives in `@layer base` so Tailwind utilities can override it (unlayered CSS beats utilities in Tailwind v4).
- Dev note: inside OneDrive, `next dev` occasionally serves stale CSS; restart the dev server (and delete `.next`) if styles look wrong.

### P0-07, P0-09 (2026-11-02)
- OSM seed (local run): 2185 named food places, 680 areas (142 suburbs, 538 neighbourhoods) + 4 regions. 9.6% of places have diet flags, 47.0% have cuisine tags, 3 places have no area. Coverage looks thin for a city this size; the human's 10-favourites check decides whether pin-drop moves earlier.
- Area resolution changed (migration 0013): covering polygon > nearest suburb within 3 km > nearest neighbourhood within 3 km. Nearest-centroid alone put Bandra places into tiny neighbourhoods (Pali Village, Ranwar). Bandra West went from 31 to 220 places. Neighbourhoods are linked to their nearest suburb via parent_id.
- Regions (south-mumbai, western-suburbs, central-suburbs, harbour) are assigned by a coarse lat/lng heuristic in scripts/osm/transform.ts. Good enough for badges later; refine when polygons arrive.
- OSM `brand` tags not in data/brands.json become their own brand rows so the chain cap still applies.
- Seed idempotency: new places inserted as confirmed; existing places get name/tags refreshed and keep their stored location, area and status. Verified: re-run leaves locations/areas unchanged and preserves a closed status.
- `public.admin_refresh_place_areas()` is executable by the secret key only (not anon, not signed-in users).
- pgTAP tests clear places/areas inside their own rolled-back transaction so seed data cannot change results.
- Suburb slugs after the load: aarey-milk-colony, abhyudaya-nagar, airoli, anand-nagar, andheri-east, andheri-west, antop-hill, anushakti-nagar, asalpha, bandra-east, bandra-kurla-complex, bandra-west, bangur-nagar, bhandup-east, bhandup-west, bhayander-pada, bhuleshwar, borivali-east, brahmand-nagar, byculla-east, byculla-west, chandivali, charkop, cheeta-camp, chembur, chheda-nagar, chinch-bunder, colaba, cotton-green, cumballa-hill, dadabhai-naoroji-nagar, dadar-west, dahisar-east, dahisar-west, danda, darukhana, deonar, dharavi, dhokali, digha, dindoshi, dongaripada, dongri, fertilizer-colony, fort, gamdevi, ghansoli, ghatkopar, ghatkopar-east, ghatkopar-west, girgaon, golibar, goregaon-east, goregaon-west, govandi-east, govandi-west, guru-tegh-bahadur-nagar, hariom-nagar, hiranandani-estate, indira-nagar, jambli-naka, jogeshwari-west, juhu, kalbadevi, kalina, kandivali-east, kandivali-west, kanjur-west, kapur-bawadi, kashimira, khar, kherwadi, kokanipada, kolshet, kopri, kurla-east, kurla-west, lal-baug, lalbaug, lokmanya-nagar, lower-parel, madh, mahalakshmi, mahim, mahul, majiwada, malabar-hill, malad-east, malad-west, malwani, mankhurd, manpada, marve, masjid-bunder, matunga-east, matunga-west, mazgaon, midc, mira, mogharpada, mulund-colony, mulund-east, mulund-west, nagpada, nahur, naupada, nehru-nagar, orlem, oshiwara, owale, panch-pakadi, parel, pawar-nagar, pirojsha-godrej-nagar, powai, prabhadevi, saki-naka, santacruz-west, sewri, shivai-nagar, shivaji-nagar, shree-nagar, sion-east, sonapur, tardeo, thakur-village, tulsi-wadi, uthalsar, vartak-nagar, vasant-vihar, vashi, versova, vidya-vihar-east, vidya-vihar-west, vikhroli-east, vikhroli-west, vile-parle-west, wadala, waghbil, wagle-industrial-estate, worli, yeoor

### Phase 0 done-when check 4: favourite places coverage (2026-11-02)
- Human's list (11): Dough and Joe, Mr Misu, Benne, Que Sera Sera, Pomodoro, My Oh My, Not Far, Naturals Now, Tanatan, Doolally, Donna Deli.
- Found exactly (6): Mr Misu (bandra-west), Benne (andheri-west; also "Benne Heritage Bangalore Dosa", bandra-west), Que Sera Sera (jogeshwari-west), Pomodoro (bandra-west), Tanatan (juhu), Donna Deli (kherwadi).
- Partial (1): Naturals Now; only generic "Naturals" outlets (18+), branch ambiguous.
- Missing (4): Dough and Joe, My Oh My, Not Far, Doolally.
- 6/11 (55%) is at the "fewer than 6 of 10" threshold. FLAGGED: recommend moving pin-drop (P5-01, P5-02) to right after Phase 1. Decision pending with the human; nothing moved yet.

### P0-10 hosted setup (2026-11-02)
- Supabase project `food-circle` (ref etxkzuujniozrnixnklg), region ap-south-1 (Mumbai), Free plan. "Automatically expose new tables" OFF (we grant per table), "automatic RLS" ON as a safety net.
- Google Cloud project "Food Circle" (food-circle-513514) on billing account "CloudSpace". Only the Google Auth Platform is used (no paid APIs). Budget "Food Circle zero spend": Rs 10/month, email alerts at 10% / 90% / 100%. Consent screen External, Testing mode, test user = owner. OAuth web client redirect URIs: hosted Supabase callback + local 127.0.0.1:54321 callback.
- Google Cloud identity verification for the billing account is due by 2026-12-24 (human to complete).
- Vercel project `food-circle` (Hobby). Production branch `main` (docs only until Phase 0 is approved and merged); Phase 0 is tested on the `phase-0-foundations` preview deployment.

### Phase 0 close-out (2026-11-02)
- Done-when: (2) pass, 220 places in bandra-west locally; (3) pass, lint/typecheck/test/db:test green; (4) flagged, 6/11 favourites found; (1) DEFERRED: hosted Google sign-in fails with "Unable to exchange external code" (likely client secret mismatch or Google propagation) and hosted migrations are not pushed yet (needs the human's DB password). P0-10 stays unticked.
- Human asked to continue building; Phase 1 starts on branch `phase-1-core-loop`, branched from `phase-0-foundations` (Phase 0 not merged to main yet).
- Pin-drop stays in Phase 5 (no decision to move it yet).
- P1-13 (dev seed) is done early: local testing needs signed-in users and Google sign-in is hosted-only. A localhost-only dev sign-in uses seed users' test passwords (never available in production).

### P1-01, P1-13 (2026-11-03)
- Onboarding completes through RPC `complete_onboarding` (the only writer of `onboarded_at`). `username_available` is a cheap existence check for the live field. Reserved names (admin, settings, route names, the `user_` placeholder prefix) are refused.
- Private accounts cannot pick Public as their default (also enforced in the RPC). Switching account type resets the default to that type's default unless "Only me" was chosen.
- `(app)` layout now requires a completed onboarding (`requireOnboardedUser`); `/onboarding` lives outside `(app)` (no bottom nav).
- `lib/supabase/server.ts` calls `await connection()` before creating the client: Cache Components otherwise flags the Supabase client reading `Date.now()` during prerender.
- Dev seed (`supabase/seed.sql`): 8 fake `@example.test` users covering friend / follower / pending follower / private / stranger / blocked / not-onboarded, 5 dev places, 12 visits across every visibility. Local test password lives in the seed file; `/dev/login` signs in as a seed user and 404s unless running `next dev` against a localhost Supabase.
- After `pnpm db:reset`, run `pnpm seed:osm` again (it uses the cached OSM download).
- OneDrive keeps serving stale modules to `next dev`; restarting the dev server fixes it. Strongly recommend moving the repo out of OneDrive.

### P1-02..P1-05 backend (2026-11-03)
- Social graph RPCs: request_friend (crossing requests auto-accept), respond_friend, cancel_friend_request, remove_friend (also drops group memberships that depended on the friendship), create_invite / revoke_invite / get_invite_preview / redeem_invite, follow_user / unfollow_user / respond_follow / remove_follower, block_user / unblock_user, report_content, admin_resolve_report (audited).
- Follow status (pending for private accounts) is set inside follow_user instead of a `set_follow_status` trigger (DATABASE.md §8): follow_user is the only client write path, and a trigger would override explicit statuses in seeds/admin tooling. Going public auto-accepts pending follow requests.
- block_user also removes mutes and companion tags between the two people.
- Daily limits per IST day: 30 friend requests, 100 follows, 10 invites, 20 reports, 20 invite redemptions.
- Invite codes: 18 random bytes -> 24 url-safe chars. Group invites are rejected until Phase 3.
- Reports now go only through report_content (direct insert grant revoked) so the rate limit can't be bypassed.
- pgTAP: 121 assertions across 9 files.

### Hosted database bootstrap (2026-11-03)
- Phase 0 migrations (13) applied to the hosted project through the dashboard SQL editor as one transaction (no DB password needed), and recorded in `supabase_migrations.schema_migrations` so `supabase db push` skips them. Supabase's editor also enabled RLS on that history table. Verified: 27 tables, 0 without RLS, signup trigger present, 12 badges.
- Phase 1 migrations are NOT on the hosted project yet; they go up when Phase 1 is approved (via `supabase db push`, or the same SQL-editor route).
- Hosted Google sign-in: Client ID in Supabase matches Google. The stored Client secret is wrong (Google only shows a secret once at creation). Fix = "Add secret" in Google, paste into Supabase (human; secrets are not typed by the agent).
- 2026-11-03: Hosted Google sign-in fixed (new client secret). Owner signed in on the phase-0 preview URL and landed on the home screen: Phase 0 done-when (1) PASS. All Phase 0 checks now pass except (4), which is flagged (6/11 favourites).
