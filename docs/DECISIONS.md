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

### P1-02, P1-03 UI (2026-11-03)
- `/friends` with tabs Friends / Requests (count badge) / Find (search by name or username, onboarded profiles only, blocked people never appear via RLS). In-app badge only, no notifications (as specified).
- Invite links: built from the request origin (works on localhost, previews, production), shared via Web Share sheet with a wa.me fallback, plus Copy. `/invite/[code]` is read-only on open; the friendship is created only by the "Add as friend" tap. Signed-out visitors are sent to sign in and onboarding with `next` preserved, so they land back on the invite.
- Relationship buttons follow UI_UX §4.6. Friends show no buttons in lists; unfriend, block and report will live in the profile menu (P1-11).
- Styled 404 page added. `/admin/reports` lists open reports for admins (is_admin set by hand) with Dismiss / Mark actioned (audited RPC).
- Browser-verified locally: sam -> asha friend request, asha accepts; sam creates an invite, chitra opens it and becomes sam's friend.

### P1-04, P1-05, P1-11 (2026-11-03)
- Profile `/u/[username]`: header, counts (places / friends / followers / following), relationship buttons, ⋯ menu (unfriend, remove follower, block, report with a reason), recent verdicts visible to the viewer (RLS). `/me` redirects to your own profile. Private accounts show a lock message to people who can't see their entries.
- Counts for other people come from `get_profile_stats` (numbers only, empty when blocked) because RLS only exposes your own relationship rows.
- Follower / following lists are shown for your own profile only (others' relationship rows aren't readable). Revisit in Phase 2 Discover if needed.
- Blocking redirects to /friends with a note (their profile disappears for you). Mute (optional in Phase 1) is not built; table and RLS exist.
- DEFERRED: an "unblock" UI. Blocked profiles are hidden from the blocker by RLS, so a blocked-people list needs a small RPC; planned with a Settings page.
- Bottom nav sits in <Suspense> with a static fallback (it reads the URL; Cache Components requires this on dynamic routes).

### P1-06, P1-07, P1-08 (2026-11-03)
- RPCs get_place (follows merged_into), get_place_summary and get_place_verdicts share one internal function (latest visible visit per author) so the counts and the list can never disagree. Tiers: 0 you, 1 friends, 2 following, 3 everyone. The domain module deliberately has no function that adds tiers together (unit-tested).
- "Latest" visit per author = latest visited_on, then logged_at, everywhere. A private or otherwise invisible newer visit never replaces a visible older one for that viewer.
- get_place_verdicts returns up to 200 rows (no cursor yet); the Everyone tier is collapsed behind "Show N more". Cursor pagination can come when a place has hundreds of verdicts.
- Place page: summary always shows all three tiers; the filter toggle (default Friends + Following) only changes the list. Sticky "I ate here" opens /log?place=…
- Swiggy/Zomato handoff: rules + link builder in lib/handoff.ts with tests; templates are null until the human verifies real link formats, so the buttons never render yet.
- Search: plain GET form, server-rendered results via search_places; "recently viewed" kept in localStorage only (never sent anywhere). "Can't find it?" says adding places is coming soon (Phase 5).
- Log flow is a page (/log) styled as a sheet; tapping GO or SKIP saves immediately, ONLY FOR saves after the short text. The visibility line always says who can see it, using real friend/follower counts. Daily cap of 60 logs per IST day (trigger).
- Measured locally: the save round trip is ~0.2 s; verdict-only logging is one tap after the sheet opens.

### P1-09 scoring flags (2026-11-03)
- recompute_visit_flags, refresh_user_scores, refresh_user_streak and an evaluate_badges stub, exactly as SCORING_BADGES.md, live in the private schema and run from the visits trigger (insert, delete, update of user/place/date/visibility). Existing visits were backfilled. `get_my_scores()` returns the caller's own cache. No score UI until Phase 6.
- Week start uses ISO day-of-week arithmetic on the date (Monday) rather than date_trunc on a timestamptz, so the session time zone can never shift it.
- Streak: a gap of exactly one missed week is forgiven and doesn't add length; it's "current" if the last active week is this week, last week, or the week before (grace).
- Visits inserted in the same transaction share `logged_at` (now() is frozen), so their order falls back to id. Real logs are one per request; bulk imports should set increasing logged_at. Tests do this explicitly.
- pgTAP scoring.test.sql covers repeats, daily cap 5 vs 6, chain cap 3 vs 4 and the next-month reset, backdating (yesterday vs two days ago), private visits (own score yes, shared score no), and delete -> recompute promoting the next place into the daily cap. Merge recompute is tested with the merge tool in Phase 5.

### P1-10 feed + function privilege fix (2026-11-03)
- get_home_feed(tab, limit, cursor_ts, cursor_id): Friends tab = accepted friends; Following tab = people you follow who are NOT friends (tiers are disjoint, FRIEND wins). Starts from the author list (fast), applies can_view_visit, excludes muted people, cursor on (logged_at, id). The page shows 20 and a "Show older" link with an opaque cursor.
- SECURITY FIX: every RPC added after 0012 was executable by `anon`, because `alter default privileges IN SCHEMA` cannot revoke PostgreSQL's global "EXECUTE to PUBLIC" default. No data leaked (every RPC checks auth.uid()), but the grant layer is now fixed for real (global default revoked, existing functions swept) and a pgTAP meta test fails if any public/private function is ever executable by anon again.
- Dev seed now spreads logged_at by visit date and recomputes flags (one INSERT statement otherwise gives all rows the same logged_at).
- Sign out moved to your own profile page (home header now: Search, Friends).

### P1-12, P1-14 (2026-11-03)
- PWA: app/manifest.ts (standalone, portrait, en-IN, cream theme), icons generated at build time by next/og from one mark in lib/icon.tsx (cream ring + dot on spice orange): /icon/32, /icon/192, /icon/512, /icon/maskable, /apple-icon. No binary icons in the repo, no service worker (Phase 7). Proxy skips icon routes so signed-out visitors and installers can fetch them. The default Next favicon was removed.
- P1-14 matrix: rls_visits_matrix (every visibility x self / friend / accepted follower / pending follower / stranger / blocked / anon, plus private account), rls_groups_places (audience groups), rpc_summary_feed and rpc_home_feed (RPCs respect the same rules), rpc_profile_stats, rls_meta (RLS on every table, no anon table or function access). 163 pgTAP assertions.
- Production build: every app route is partially prerendered; secret key absent from client bundles.

### Phase 1 close-out (2026-11-03)
- Done-when steps 1-5 are automated in supabase/tests/done_when_phase1.test.sql (three fresh users A, B, C; invite link, follows, three visits, tier labels, private/followers visibility, block). 14/14 pass.
- Step 5b (new user, zero friends): browser-verified with the not-onboarded seed user: onboarding -> search -> place page with Everyone counts and an "Add friends" nudge in ~40 s including tool overhead. Added a "See everyone" button to that nudge, and the Everyone tier opens automatically when it is the only content under the Everyone filter.
- Step 6 (verdict-only log under 10 s): one tap after the sheet opens; save round trip ~0.2 s locally.
- NOT DONE: Playwright smoke tests (TESTING.md §4: auth, log-flow, tiers, friends, a11y) are not written yet, so `pnpm test:e2e` has nothing to run. Needs `playwright install chromium` (a ~150 MB browser download). Waiting on the human's go-ahead.
- NOT DONE: real-phone check (Android Chrome + iPhone Safari) and Lighthouse numbers. Needs the human's devices / the hosted preview with Phase 1 migrations applied.
- Phase 1 database changes are not on the hosted project yet; they go up when Phase 1 is approved.

### Circle reveal transition (2026-11-03, requested by the human, outside the phase plan)
- Recreated the reference video's transition (613.mp4): the next screen grows out of the tapped element as a circle (~0.27 s to cover in the reference; ours 520 ms with cubic-bezier(0.32, 0.72, 0, 1)), and closing shrinks it back into the same origin with an ease-in (340 ms). The 2x2 cards were left out, as the human asked for the transition only.
- Built on the browser View Transitions API (document.startViewTransition) + CSS clip-path keyframes on ::view-transition-new/old(root). No dependency, nothing extra in the DOM, no layout shift; reduced motion and unsupported browsers navigate instantly.
- Triggers: the + Log button and "I ate here". The log screen became a spice-orange full-screen takeover (editorial heading, the white sheet on top, dark x close top-right; bottom nav hidden), echoing the reference's red screen. "Done" after logging also closes with the circle back to the place.
- Gotcha fixed: the "new route committed" signal must not use requestAnimationFrame. Rendering is suppressed while a view transition waits for its update callback, so rAF never fired and every reveal stalled until the 1.5 s safety timeout.
- Edge cases verified on a production build: double-tap open (one transition), double-tap close (one), close mid-open (open skipped, close plays), reduced motion (no transition), same-URL navigation (no transition). Circle starts 9-21 ms after the tap; open finishes ~535 ms, close ~360 ms. No console errors.
- Tuning lives in app/globals.css (--vt-open-duration, --vt-open-ease, --vt-close-duration, --vt-close-ease).

### Phase 1 approved and deployed (2026-11-03)
- Human approved Phase 1. main fast-forwarded to phase-1-core-loop; Vercel production: https://food-circle-xi.vercel.app
- Hosted DB: the 7 Phase 1 migrations applied through the SQL editor in one transaction and recorded in supabase_migrations (20 total). Verified 0 functions executable by anon.
- Hosted places: new `pnpm seed:osm:sql <file>` writes the cached OSM seed as idempotent SQL (same mapping as seed:osm; existing places keep location/area/status), so a hosted DB can be seeded through the SQL editor without the secret key. Hosted now has 2185 places (2182 with an area) and 684 areas, matching local.
- Gotcha: copying a UTF-8 file to the Windows clipboard needs `Get-Content -Raw -Encoding UTF8`; without it Devanagari names became mojibake and the first seed run failed (rolled back). The earlier migration bundles had non-ASCII only in comments, so the applied SQL was unaffected.
- Supabase Auth: Site URL is now the production URL; redirect allowlist = production, all food-circle previews, localhost.
- Repo hygiene: `ui_designing/` (personal reference images, some third-party) was accidentally committed in 3095b6d via `git add -A`; it is now untracked and gitignored. It remains in public git history until the human decides whether to rewrite history. Agent now stages explicit paths only.

### Phase 2: Discover people (2026-11-03)
- P2-07: contacts matching is NOT built. The Contact Picker API only exists in some Android browsers and phone-number matching would need phone auth. Invite links (Phase 1) and "People you may know" (friends of friends) replace it.
- Taste match (P2-03): per pair, each person's latest non-private visit per place, counted only when each visit is visible to the other person; agreement = same verdict (Go/Skip/Only for). Rate = agreed / shared x 100, stored in taste_matches and returned only at 5+ shared places (enforced in SQL, private.match_with). Refresh: lazily when you open Discover or someone's profile, and nightly at 21:30 UTC (03:00 IST) by pg_cron inside Postgres (migration 20261104000002) calling the service-role-only `refresh_all_taste_matches`. First built as a Vercel Cron route guarded by CRON_SECRET; replaced the same day so there is no public endpoint and no secret to manage (pg_cron is included on the Supabase free plan).
- Not yet used to rank the Following tier: the Following feed stays in time order and place pages still order by tier then recency. Re-ranking inside the Following tier by match rate is deferred until there is real data; trust tiers stay separate either way.
- Browse (P2-02): "food type" = cuisine tags of places the person has visibly logged; the Discover screen shows two curated Mumbai lists (vada pav, Irani cafe) plus veg/Jain diet (merged). Area includes child suburbs. Everything counts only visits the viewer can see.
- Discover excludes yourself, existing friends, blocked users (either way), banned and not-yet-onboarded profiles. Private accounts are listed (name only) so people can request to follow.
- Bottom nav is now 5 slots: Home, Discover, + (log), Friends, Me.
- P2-06: after onboarding, /onboarding/follow shows up to 5 real people (home area first, then most active) and skips itself when there are none. Follow is optional; Continue always works.
- After logging (P2-04): up to 3 people outside your friends/follows who logged the same place publicly, with a count of the rest.

### Phase 2 approved and deployed (2026-11-03)
- Human approved Phase 2. main fast-forwarded to phase-2-discover (c1ced09); Vercel production deployment Ready.
- Hosted DB: both Phase 2 migrations applied in one transaction through the SQL editor and recorded (22 total). pg_cron job `refresh-taste-matches` scheduled at 21:30 UTC; a manual run of refresh_all_taste_matches succeeded (0 pairs, not enough shared places yet). Still 0 functions executable by anon.
- Signed-in check of the live Discover / follow step is left to the human (the agent does not sign in with the human's Google account).

### Wider place coverage + search-as-you-type (2026-11-03, requested by the human before Phase 3)
- Human asked for Zomato/Swiggy-level coverage of Mumbai restaurants and cafes. Scraping Zomato/Swiggy and harvesting Google results area by area were declined (CLAUDE.md rules 7 and 8); the human approved Overture Maps Places instead.
- Source: Overture Maps release 2026-10-21.0, Places theme. Licences per source: CDLA-Permissive-2.0 (almost all rows), Apache-2.0 (Foursquare), CC0 (AllThePlaces); attribution "Overture Maps Foundation" added to the footer next to OSM (https://docs.overturemaps.org/attribution/).
- Scope: clipped to Greater Mumbai = Overture divisions "Mumbai City District" + "Mumbai Suburban District" (no Thane, Mira Road, Navi Mumbai). Food categories: restaurants, casual eateries, fast food, cafes/coffee/juice, bars, food trucks, bakeries, dessert/sweet/ice-cream shops. Dropped: closed places, confidence < 0.2, category-only names ("Restaurant", "Bakery & Cake Shop"), caterers/delivery-only kitchens.
- Confidence < 0.5 is imported as `unverified` (the existing status; it becomes confirmed once people log there, P5-03). Unverified places rank slightly lower in search.
- Result: 16,075 candidate places; 14,962 inserted, 879 linked to an existing OSM place (same place: name similarity >= 0.45 or containment, within 75 m), 234 skipped as duplicates. Local and hosted now ~17.1k places (was ~2.2k).
- Schema (deviation from DATABASE.md, which wins on schema; recorded here): `places.overture_id text unique` and `source` may be 'overture'. Our UUIDs stay primary keys (rule 4). Import goes through `admin_import_overture(jsonb)`, service-role only; idempotent; batches are safe to run in one transaction. Hosted import: `pnpm seed:overture --sql <dir>` writes SQL batches for the SQL editor.
- New dev dependency: @duckdb/node-api (dev only, never shipped to the client): reads only the Mumbai slice of Overture's GeoParquet on S3 (~1-2 min); raw extract cached in data/raw/ (gitignored).
- Known gap: when OSM and Overture spell one place very differently (e.g. "Britannia Cafe" vs "Britannia & Co. Restaurant") both remain; merging is the Phase 5 admin tool. Tiny thelas are still best covered by user-added places (Phase 5).
- Search-as-you-type: suggestions on every keystroke (90 ms debounce, stale requests aborted, per-session cache, spinner only after 180 ms) via GET /api/places/suggest (a route, not a server action, because actions run one at a time). Combobox pattern with arrow keys, Enter, Escape, live-region count; matched text bolded; "Try" chips and recently viewed when empty; entrance animation only when a list first appears (reduced motion: none). Without JS it is still a GET form with server-rendered results.
- search_places is now PL/pgSQL so each call is planned with the actual text: 2-letter queries match name starts via a btree prefix index; 3+ letters use trigram + substring. 2-21 ms on 17k places locally (was ~200 ms for 2 letters).
- Deployed 2026-11-03 (human: "Yes, deploy now"): both migrations applied via the SQL editor (24 recorded; 0 anon-callable functions; signed-in users cannot run the import). Places imported in 9 batches of 2000 rows (the SQL editor rejects ~1 MB queries). Hosted: 2185 OSM + 14,980 Overture (4,619 unverified), all with an area.
- Place pages with photos/menus pulled from the web: declined (copyright, Zomato/Swiggy terms, rules 7-8). Offered instead: legal place-page redesign (Overture website/socials, directions, "See menu" link-out), Swiggy/Zomato handoff buttons, user photos/dishes (Phase 4). Human put this on hold.

### Phase 3: Optional groups (2026-11-03)
- Membership: `group_member_must_be_friend` trigger (members must be accepted friends of the owner; the owner is a member with role owner). Limits: 20 groups per owner, 50 members per group (`group_full`). Only the owner adds/removes members and creates group invite links; members can leave; the owner deletes instead of leaving.
- Group invite links: a friend of the owner joins with one tap. A non-friend sees "needs_friendship" and can tap "Add <owner> as friend and join", which creates the friendship through the same link (the owner pre-consented by sharing it, exactly like friend invites; API_SPEC said "offers to become friends via the same inviter first"). Opening the link still changes nothing.
- Audience groups (P3-04): only on Friends visits, only groups the author is in (`audience_groups_only_for_friends` trigger); enforced by the existing can_view_visit. Logging with groups uses `log_visit_for_groups` (security invoker: normal RLS + column grants), so the visit and its audience are written in one transaction and the entry is never briefly visible to all friends. Changing a visit away from Friends drops its audience rows.
- Never widen on delete: deleting a group turns visits that were shared only with that group into Private (otherwise they would fall back to all friends). Rule 10: narrower wins.
- Group tag (P3-03): `private.shared_group_name`: the visit's audience group if the viewer is in it, else a group viewer and author share. Shown on place pages and feeds; not repeated inside a group's own feed.
- Group feed (P3-05): `get_home_feed('group:<uuid>')`, members' visits the viewer may see, each with its own relationship tier (members aren't necessarily the viewer's friends, so tiers stay separate). Home shows one tab per group after Friends and Following; /groups lists groups, /groups/<id> has feed, members, add friends, invite, leave/delete. Friends page links to Groups.
- P3-06: groups are created private with leaderboard off; there is no setting to change either yet (Phase 6).
- Not built: "Add to group" in a friend's profile menu (UI_UX §4.6); adding from the group page covers it. Browser click-through was not possible at the end of the phase (Chrome extension disconnected); covered by 30 pgTAP assertions including the Done-when scenario and a production build.

### Device layouts: phone, iPad, PC (2026-11-03, requested by the human before approving Phase 3)
- Same routes, layout chosen by width (no user-agent sniffing): phones < 768px keep the original single 480px column + bottom nav; iPad (md, >= 768px) gets an 84px icon rail with the Log button and a 720px column; PC (lg, >= 1024px) gets a 248px labelled sidebar and up to 1080px of content.
- Two-column pages on PC: Home (feed + side panel with search, your groups, people to follow), place page (summary + "I ate here" pinned left, verdicts right), group page (feed + members/add/invite), groups list (list + create form), login (pitch + sign-in card). Discover shows section cards (1 column on iPad, 2 on PC). Friends, profiles and search stay at a reading width (max 672px).
- iPad/PC show "I ate here" inline instead of the phone's floating bar; the log takeover drops the sidebar and centres the sheet. Side nav adds Search and Groups (room the phone bar doesn't have).

### Want to go list (2026-11-03)
- Human asked for a map of places visited and places still to visit. Visited pins were already planned (P5-06); a "Want to go" list was not in any phase. Added as P5-11 with the map showing both, and extended Phase 5's Done-when. Private by default, no points (the Visit stays the only scoring unit).

### Phase 3 approved and deployed (2026-11-03)
- Human approved Phase 3 (groups + device layouts). Groups migration applied to the hosted DB via the SQL editor (25 recorded, 4 group triggers, 0 anon-callable functions); main fast-forwarded and pushed to Vercel.

### Phase 4: Depth, one tap away (2026-11-03)
- The verdict still saves on the first tap; everything else appears after it, on the success step (P4-01: best-dish chips with this place's top dishes as one-tap suggestions, a price-per-head slider that stays "Not set" until touched, occasion chips) and on /visit/<id> ("Add more", P4-02: note, per-dish Go/Skip, price, occasions, photos, delete review).
- Price bands per head (Mumbai): up to Rs 300 Budget, up to Rs 800 Mid, above Splurge. Slider Rs 50-3000 in steps of 50; the top reads "Rs 3000+". Stored as whole INR.
- Saving is one RPC, `save_review` (security invoker: normal RLS + column grants), so note, price, occasions and dishes change together. Dishes are replaced on each save; names are tidied and normalized by a trigger; max 10 dishes, max 6 photos (trigger), occasions limited to the six known tags (check constraint).
- Photos (P4-03): compressed in the browser (canvas -> WebP, long edge <= 1280, quality 0.82 down to 0.52, then shrink 20% and retry, until < 300 KB). Redrawing drops EXIF/GPS. Bucket `review-photos` is private, WebP only, 400 KB hard cap server-side. Upload goes from the browser into `{user}/{visit}/{uuid}.webp` (storage insert policy: own folder, own visit); the row is then recorded by a server action (path pattern enforced by a trigger). Reads: the object is readable only when a visit_photos row the viewer can see references it, so signed URLs (1 hour) are created with the viewer's own session; never public URLs.
- Verdict cards (P4-04) expand with a native <details> ("More · Best dish: ... · 1 photo"); details for a whole feed/place page load in one batch (`get_visit_details`, security invoker so RLS decides).
- Top dishes (P4-05): `get_place_top_dishes` uses the same latest-visible-visit rows as the tier summary, top 5 per tier, shown as separate Friends / Following / Everyone lists, never merged. Your own dishes are not listed there.
- P4-06: delete review removes reviews, dishes and review photos (rows and storage objects); the visit and its point stay. P4-07: each log stores the chosen visibility as profiles.default_visibility.
- Done-when: verdict-only log is still one tap (saved instantly in the browser test); quick extras (dish + price + occasion + save) are four taps; a 2000x1500 8.3 MB PNG was stored as a 1024x768 246 KB WebP. Delete review was not clicked in the browser (it uses a confirm dialog); covered by the code path and RLS tests.

### Phase 4 approved and deployed (2026-11-03)
- Human approved Phase 4. Depth migration applied to the hosted DB via the SQL editor (26 recorded; 0 anon-callable functions; bucket review-photos private, 400 KB cap; 3 storage policies). main fast-forwarded and pushed to Vercel.

### Phase 5: Pin-drop, diary, logbook (2026-11-03)
- Map tiles: OpenFreeMap "liberty" style (OSM-based, free, no API key or account; attribution shown by the map control). Override with NEXT_PUBLIC_MAP_STYLE_URL. New dependency maplibre-gl@5 (the map library CLAUDE.md names); imported only inside MapView via dynamic import, so pages without a map never download it.
- Pins never rely on colour alone: Been = orange with a tick, Want to go = blue with a star, plus a text legend and Both / Been / Want to go toggle.
- create_place (P5-01/02): Mumbai-region box check, 20 new places a day, find_place_candidates first ("Is this the same place?"), p_force for "No, it's different". New places are source 'user', status 'unverified'; cuisine tags normalized to snake_case. Location is only requested when the user taps "Use my location". The first map tap zooms to street level for a precise pin.
- confirm_place_if_two_users (P5-03) trigger. merge_places (P5-04) as PLACES_DATA section 7, plus: moves Want to go entries, confirms an unverified target, returns (moved visits, affected users), recomputes every affected user. Admin pages /admin/places/merge (side-by-side preview read with the secret key only after the is_admin check) and /admin/places/suggestions.
- suggest_place_fix / admin_resolve_place_suggestion (P5-05): closed, type, name, diet and cuisine apply automatically; "moved" is marked actioned after the admin moves the pin by hand (no map editor in admin yet).
- Diary (P5-06): /diary with Timeline (own visits, cursor paging, On this day card), Map, Logbook (P5-10: unique places, areas covered, places by area and by cuisine). Phone nav: Diary replaces Friends as the original plan said; Friends stays one tap away from Home and Me, and is in the iPad/PC side nav.
- Memories (P5-07) and companions (P5-08) on /visit/<id>: private note, mood, occasion, who can see it (Only me / friends who can see the visit), memory photos (kind 'memory', same 6-photo limit per visit). Tagged friends get "X tagged you at Y" on Home; "Add to my log" opens the log sheet on that place and date; tagging gives no points. Gotcha fixed: memories use update-or-insert instead of upsert, because ON CONFLICT DO UPDATE also updates visit_id, which column grants forbid.
- Backdating (P5-09): "Earlier date?" on the log sheet (date picker capped at today IST); scoring rules for backdated visits already live in SQL.
- Want to go (P5-11): want_to_go table (RLS: own rows only), save from a place page or the Save button on someone else's feed card (remembers which verdict it came from), max 500, removed automatically when you log a visit there.
- Done-when automated in rpc_phase5.test.sql (26 assertions). Browser-verified: pin-drop -> created + area resolved -> logged -> Been pin; Want to go pin; logbook; timeline; memory + companion tag -> prompt on the friend's Home -> log sheet prefilled. Admin screens not clicked (no admin dev user); covered by tests.
- Map pin details (2026-11-03, human request): hovering a pin (PC) or tapping it (phone/iPad, no hover) opens a card with the place name, a "Been"/"Want to go" text badge, your latest verdict (incl. the Only for note), area and type, cuisines and diet, visit count and last visit date (or the date you saved it), and "Open place". Pins are buttons (keyboard focus also opens the card); the card is built with textContent only, never innerHTML. get_my_map now returns these fields; card text comes from lib/domain/mapCard.ts (unit-tested).

### Phase 5 approved and deployed (2026-11-03)
- Human approved Phase 5 (incl. map pin details). Diary/places migration applied to the hosted DB via the SQL editor (27 recorded; 0 anon-callable functions; want_to_go RLS on; 3 new triggers). main fast-forwarded and pushed to Vercel. Map tiles: OpenFreeMap (no key or env var needed).

### Explore layer on the diary map (2026-11-03, human request)
- "Explore new places" switch on Diary > Map: shows places in the visible area that you have not been to or saved, as smaller white "+" pins under your own ✓/★ pins. Filters: type chips (default Cafe) and Pure veg. The pin card has "★ Save to Want to go" (the pin turns into a star at once) and "Open place".
- Data: get_places_in_view (signed-in only) over the places table with a bounding box; refuses boxes larger than about 0.25 x 0.25 degrees (the UI says "Zoom in"), at most 300 places, confirmed first then a stable shuffle so they spread across the view; excludes merged/closed places and your own visits and Want to go. Served by GET /api/places/in-view so panning can cancel stale requests (debounced 250 ms). About 40 ms locally for a Bandra-sized view.
- The map fits to your own pins only once, so it never jumps while exploring.
- Deployed 2026-11-03 (human: "approve and deploy"): explore migration applied via the SQL editor (28 recorded, 0 anon-callable); main fast-forwarded and pushed.

### Speed and smoothness (2026-11-03, human request)
- Root cause of slow page loads after deploying: Vercel Functions ran in Washington DC (iad1, the default) while Supabase is in Mumbai, so every database call from a server-rendered page crossed the globe twice (pages make several). vercel.json now pins functions to bom1 (Mumbai), next to the database (Hobby allows one region). Done in the repo, not the dashboard, so it is reviewable and reproducible.
- Router cache: experimental.staleTimes { dynamic: 30, static: 300 }, so tab switches and back/forward within 30 s are instant. Server actions already call revalidatePath after every change, which clears it.
- Preconnect (react-dom preconnect) to the Supabase URL, OpenFreeMap tiles and Google avatars.
- Smooth navigation: app/(app)/template.tsx gives each page a 200 ms fade + 6 px rise (transform/opacity only; off for reduced motion and for the log takeover's circle reveal).
- Home loads group tabs and the feed in parallel; photos and avatars decode asynchronously with a soft placeholder.

### Phase 6: Competition and badges (2026-11-03)
- Scoring rules are unchanged (Phase 1 recompute). Added: badge engine (badge_progress + evaluate_badges, JSON rules; the five Phase 6 badges active, Phase 7 rows stay inactive), First Finder re-checked for earlier friends when someone logs a place, level = floor(sqrt(all-time places)) in private.level_for.
- Leaderboards (P6-02): get_leaderboard for friends, following, or a group (member + owner opt-in via set_group_leaderboard; family groups start off). Week / month / all-time; ranked by shared places, then verified visits, then earliest; excludes blocked people and anyone who opted out (profiles.leaderboards_opt_in, toggle on your own profile). There is no city-wide scope and the RPC rejects anything else. Returns "N more places to pass X".
- Feature flag: NEXT_PUBLIC_LEADERBOARDS_ENABLED is now on unless set to 'false' (Phase 6 ships it).
- Post-log feedback (P6-03): get_visit_feedback gives new_place / all_time_only / repeat / daily_cap / chain_cap with neutral copy, plus the month score and the friend just ahead.
- Streak copy (P6-05): "N weeks of new places", a grace week note, never "you lost your streak".
- Profile (P6-06): level chip, progress card on your own profile, badge list, leaderboard opt-in. Verdict cards show up to 2 author badges (behaviour badges first): one on phones, two from 640px.
- Verified visits (P6-07): verify_visit within 150 m of the place and within 12 hours of logging (so old visits can't be verified later); location asked only on tap; never blocks; breaks ties only.
- Navigation: Leaderboard in the iPad/PC side nav; on phones via Diary (progress card + link) and your profile.
- Done-when automated in rpc_competition.test.sql (23 assertions: 5-person group board, repeats, private and backdated rules, blocks, opt-out, group permissions, badges incl. caps, feedback, verification). Daily/chain caps also covered by scoring.test.sql. Browser-verified: leaderboard, progress card, "New place! +1" after logging, profile badges section.

### Phase 6 reworked: achievements instead of leaderboards (2026-11-03, human decision)
- The human asked for no leaderboard and no competition: achievements with unique, catchy badges, shown with descriptions, and a way to customise the profile with them. This overrides PRODUCT_SPEC pillar 4 ("friendly competition") and SCORING_BADGES section 4 (leaderboards); the human's explicit instruction wins. The unreleased leaderboard migration was replaced before it ever reached the hosted database.
- 37 active achievements (data in migration 20261110000001_achievements.sql, upserted by slug): milestones (First Bite, Ten Plates Deep, Half Century of Hunger, The Hundred Plate Club), place types (Bean There Done That, Caffeine Cartographer, Thela Whisperer, Crumb Collector, Mithai Mafia, Happy Hour Historian), taste and money (The Fine Diner, Pocket Change Gourmet, Random Taste Generator, Cuisine Chaos Agent, Pure Veg Pilgrim, Chain Breaker, Vada Pav Veteran, Bun Maska Bureaucrat, Udupi Uncle), places (Bandra Native, SoBo Soul, Suburb Surfer, Pin Code Hopper, All Lines Lead to Lunch, Map Maker), verdicts and writing (Brutally Honest Bhai, Skip Lord, The "Only For" Oracle, First Finder, Menu Archaeologist, Shutterbug Snacker, Diary Poet, Wishlist Hoarder), habits (Weekly Wanderer) and secrets (Night Owl Nibbler, Sunrise Snacker, Same Again Bhaiya). Trusted Taster, Family Table, Local Train Foodie, Thali Master stay inactive (need data we don't have).
- Badges gained icon (emoji), is_secret and sort. Secret badges are masked ("???") until earned. Your own locked badges show progress; other people only ever see what someone has earned. Blocked people see nothing.
- Showcase: profile_badges (up to 3, ordered, earned only, writes only via set_showcase). Shown under the name on profiles and beside the author on verdict cards (1 on phones, 2 from 640px).
- Kept as personal-only: level, place counts, weekly streak (grace week). Removed: leaderboard page and nav, group boards, leaderboard opt-in, "X is ahead of you", verify button.
- Caps still apply to counted places (5 new per day, 3 outlets per chain per month), so achievements can't be farmed by logging a whole street in one go.

### Phase 6 (achievements) approved and deployed (2026-11-03)
- Human approved. Achievements migration applied to the hosted DB via the SQL editor, copied as UTF-8 (emoji icons): 29 migrations recorded, 0 anon-callable functions, 37 active achievements, existing users' badges awarded. main fast-forwarded and pushed to Vercel. The leaderboard migration never reached the hosted DB.

### Phase 7: India polish (2026-11-04)
- P7-08 phone OTP sign-in is on hold (human decision). Google sign-in stays the only method.
- P7-02 area boards are not built: the human replaced all boards with personal achievements in Phase 6. Area flavour lives in the badges (Bandra Native, SoBo Soul, Suburb Sommelier) instead.
- P7-01 India badges: stations table (58 suburban railway stations from OpenStreetMap, ODbL) feeds "Next Station: Snacks" (a counted place within 400 m of 10 stations; 25 for Platform Number Gourmet) and "Platform Gourmet". New rules: friends_acted_on_go ("The Unpaid Influencer": a friend went within 30 days of your Go and also said Go), family_visits ("Family Table", visits shared with a family group). Thali Mahaan and Stamp Collector added. 44 active achievements.
- P7-03 year recap: get_year_recap returns only your own visits for an IST calendar year. /recap?year=, linked from Diary and your profile.
- P7-04 share cards: a public link is created only when you tap Share. The snapshot is frozen at creation and holds counts, area/cuisine names and badge names, never notes, photos, companions or the list of places you visited. Tokens are long and random (same generator as invite codes), pages are noindex, and you can revoke a link. Images via next/og: 1200x630 link preview and 1080x1920 story; emoji via twemoji.
- P7-05 PWA: hand-written public/sw.js (no new dependency). Static assets cache-first, pages network-first with the last 40 pages kept for offline reading, /offline fallback, /api and /auth never cached. Page copies are wiped on the login screen so a shared phone never shows the previous person's diary. Install prompt on your profile (Android prompt, iOS "Add to Home Screen" hint).
- Web push: new dependency web-push (sends VAPID-signed pushes; no hosted push service needed, free). Pushes: friend request, companion tag, and (opt-in, off by default) a friend's new verdict that you are allowed to see (push_targets_for_visit re-checks visibility; service role only). Expired subscriptions are deleted. Push is disabled unless NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are set; the human must add them (plus VAPID_SUBJECT) in Vercel. Keys are never committed.
- P7-06 Hinglish: hinglish_fold maps common spellings (vada/wada, pav/pao, chai/chay, biryani/biriyani, kebab/kabab, ...) for search on both the query and stored names. Voice is a time-boxed experiment: dictation uses the browser's own speech recognition (hi-IN / en-IN toggle) and only inserts text; we never record or upload audio. Hidden where the browser lacks support.
- P7-07 analytics: self-hosted in our own Postgres (no third-party tracker, no cookie). /api/t accepts only allow-listed event names (page_view, log_saved, place_added, share_created, recap_viewed, install_accepted, install_dismissed, push_enabled, dictation_used) with a route pattern (ids and usernames stripped) and a device class. No user id. Errors are scrubbed of emails, uuids and long numbers. Tables are readable by admins only.

### Phase 7 approved and deployed (2026-11-04)
- Human: "deploy". VAPID env vars added in Vercel (private key as Secret by the human, public key as Config because NEXT_PUBLIC_ values are sent to the browser, subject = the site URL). India polish migration applied via the SQL editor (UTF-8): 30 migrations recorded, 0 anon-callable functions, 44 active achievements, 58 stations. main fast-forwarded and pushed.

### Sign-in page redesign: "scrapbook" (2026-11-07, human request)
- Human asked for a far more striking sign-in page using the ui_designing mood board. The mood board images are downloaded third-party art (stock "premium" PNGs, Redbubble/Pinterest stickers), so none are shipped or committed; they were used only as style reference. Every sticker (vada pav, cutting chai, halftone pizza, sunflower, spiral star, scribbled star, GO stamp, a sunglasses cat mascot) is original inline SVG in components/login/Stickers.tsx.
- Look: cream paper with grain and halftone corners, die-cut white sticker borders (SVG dilate filter), wobbly hand-cut edges (turbulence filter), a red ribbon and blue wavy stripes that draw themselves, turning maze rings, a taped note whose verdicts stamp in, a ticket-shaped sign-in card, and a dish-name marquee tape.
- Motion: CSS only (transform, opacity, stroke-dashoffset), no new dependency. One tiny client component (LoginFX) adds sticker parallax, a halftone spotlight under the cursor and a magnetic Google button, for mouse/trackpad only. Everything is static under prefers-reduced-motion. Decorative art is aria-hidden; strings live in lib/copy.ts.
- Update (2026-11-07, human request): the food stickers are now the human's chosen mood-board images (halftone burger and dessert, watercolour croissant, pizza, fries, ice cream, egg toast), plus a stacked-eyes sticker that bleeds off the top-right corner and a halftone push pin holding the note. Backgrounds were removed locally and saved as WebP in public/login (~340 KB total; only the visible ones load). These are third-party images: the human chose to use them and must confirm the licences allow use in the app before a public launch. The eyes were cut from a screenshot (about 340x475 px), so they may look soft on high-DPI screens. Cursor-following effects (parallax, spotlight, magnetic button) were removed at the human's request, and LoginFX was deleted.

### Name: SKOOP (2026-11-07, human decision)
- The product is now called SKOOP. APP_NAME in lib/config.ts changed; every user-facing string reads it (copy, push titles, share cards, the visibility label). The service worker title is a literal (static file) and its cache version moved to fc-v2. Internal names (package.json "food-circle", script comments, the fc- CSS prefix, the repo folder) stay for now.

### Sign-in page v3: the full mood-board collage (2026-11-07, human request)
- The human felt v2 did not match the mood board and asked for a complete redesign using every element in ui_designing. Now: the board's own palette on this page (cream paper, ink, cherry red, sunflower yellow, cobalt, pink) instead of the app's orange; a ransom-note SKOOP wordmark with each letter cut from a different paper; a handwritten "psst" line; a black-and-red ticket; crossed yellow and black tapes; and the whole collage around the edges (lantern swinging, vinyl spinning, a hand pointing at the Google button, camera flash, cats tucked behind and on the cards, flowers, stars, waves and all the food).
- 31 of the 32 board images are used (the red cat face was left out because it reads as another app's logo; the maze is drawn as SVG rings so it can turn). Backgrounds were removed locally, each got the same white die-cut border, and they ship as WebP in public/login (~780 KB of sources; next/image serves each at the size shown, and pieces hidden on phones are never downloaded). The licence caveat above still applies.
- Two display fonts only on /login via next/font (self-hosted, no npm dependency): Anton (condensed tape lettering) and Permanent Marker (handwriting). Nothing follows the cursor. All motion is CSS and off under prefers-reduced-motion.
- The rest of the app still uses the original orange theme; carrying the collage palette into the app is a separate decision for the human.
- Update (2026-11-07, human: "too clustered"): trimmed to a curated set with breathing room: eyes (top-right), swinging lantern, croissant, halftone burger, iced coffee, spinning vinyl, plus the pin, sunflower and GO stamp on the note, the sunglasses cat on the ticket and the hand pointing at the Google button. One dish tape instead of two crossed tapes. Unused images removed from public/login (11 remain).

### Logo (2026-11-07, human)
- The SKOOP logo is the human-supplied mark: a black cat in orange sunglasses eating a slice of pizza. Background removed and stored as public/brand/skoop-mark.png (512px, used by next/og for the tab, install, maskable and Apple icons and on share cards) and skoop-mark.webp (UI). It appears in the side nav, the phone home header and the sign-in page. The sunglasses-cat sticker on the sign-in ticket was removed at the human's request.
- Logo everywhere (2026-11-07): a Brand component (mark + name) heads the invite, onboarding, follow, 404 and public share pages, alongside the side nav and phone home header. The offline page keeps its emoji because the optimised logo image is not in the offline cache.
- Deployed 2026-11-07 (human: "deploy"): design/login-scrapbook fast-forwarded into main and pushed. No database changes.

### App-wide SKOOP theme and GSAP motion (2026-11-07, human request)
- New dependencies: gsap 3.15 and @gsap/react 2.1, for the app-wide motion layer the human asked for ("high end gsap animations"). GSAP is under its Standard no-charge licence (commercial use allowed; it only forbids building a competing no-code animation tool). Core only (~25 KB gzipped); no ScrollTrigger: reveals use IntersectionObserver so they also work inside scrolling panels.
- Theme: the sign-in palette now runs the whole app through the existing tokens: paper background (#f5ede0 with grain), warm-white cards (#fffaf2) with a soft paper shadow and 20px corners, cherry primary (#b0141b, AA on white and paper), and sun/cobalt/pink accent tokens. Primary buttons have an ink "print" edge that presses in. Verdict colours (Go/Skip/Only for) are unchanged.
- Motion layer (components/motion): PageMotion in app/(app)/template.tsx eases each page in, lifts the first headline out of a clip, and reveals every Card / achievement tile with a staggered rise as it enters the screen (progress bars fill up). It tracks elements in memory and waits until React has hydrated a node before touching it (no hydration warnings). NavPill glides the highlight to the active tab in the bottom bar and side menu, with an icon pop. CountUp counts the progress numbers up. Burst celebrates an unlocked achievement (spring-in, spinning icon, paper confetti). The Log button breathes gently. The progress card is now an ink "ticket" card.
- Everything is off under prefers-reduced-motion, and nothing is hidden unless the motion layer is actually running.
- Update (2026-11-07, human: "the constant red pinging doesn't look good"): the Log button pulse is gone and the motion layer has no loops at all; every animation plays once in response to something. Varied moves instead of one: cards are dealt in (alternating tilt), achievement tiles and empty states pop in a ripple, the ink progress card flips up, verdict labels stamp down, photos settle in, bars fill, and tab underlines glide (also across tab navigation). Mood-board stickers now head the main pages (Discover: eyes, Diary: camera hand, Achievements: torn stars, Search: lantern, Recap: record, Groups: black cat, Add place: croissant) and every empty state gets a food sticker; stickers are "slapped on" once. Small 240px copies live in public/stickers (~280 KB total, only the ones on screen load).
