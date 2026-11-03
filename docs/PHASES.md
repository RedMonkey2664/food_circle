# PHASES.md: build order

Tick checkboxes as tasks finish. Each phase ends with a "Done when" scenario that must pass before the next phase starts. Size tags: S (hours), M (a day or two), L (several days).

Phase map:

```
0 Foundations            deployed skeleton, schema, auth, OSM seed
1 Core loop              friends + follow + log + place page with tiers + feed
2 Discover people        find people, taste match, suggestions
3 Optional groups        Family / College gang, group tag, group feed
4 Depth, one tap away    dishes, price, occasion, notes, photos
5 Pin-drop and diary     thelas, dedupe, merge tool, diary, logbook, memories
6 Competition and badges scoring surfaced, leaderboards, badges, streaks
7 India polish and growth India badge set, recap, share cards, PWA push, analytics
```

Cut order if behind: Phase 7 first, then voice/follow extras, then Phase 3. Never cut Phases 0 to 2 and 5.

---

## Phase 0: Foundations

Goal: an empty but deployed app with the correct skeleton and the full schema.

- [x] P0-01 (S) Init repo: Next.js App Router, TypeScript strict, Tailwind, pnpm, ESLint, Prettier, Vitest, Playwright. Add the scripts listed in CLAUDE.md. Add README.md with setup steps.
- [x] P0-02 (S) `supabase init`; enable extensions postgis, pg_trgm, citext in the first migration.
- [x] P0-03 (L) Migrations per the "Migration order" list in DATABASE.md (tables, helper functions, place functions, scoring functions, triggers, badge rows). Create ALL tables now even though most UI comes later.
- [x] P0-04 (M) Row Level Security per SECURITY_PRIVACY.md on every table, plus helper functions (are_friends, is_following, is_blocked_between, can_view_visit).
- [x] P0-05 (M) Auth: Supabase Google OAuth, session refresh middleware, `/login`, protected `(app)` layout, trigger that creates a profiles row on signup (username filled during onboarding).
- [x] P0-06 (M) Design tokens, Tailwind theme, base components per UI_UX.md (Button, VerdictButtons, RelationshipTag, Card, BottomNav shell, DietBadges). Add a dev-only `/dev/components` page.
- [x] P0-07 (M) OSM seed script `pnpm seed:osm` per PLACES_DATA.md: Mumbai restaurants/cafes/etc into `places`, area boundaries or fallback into `areas`. Idempotent (safe to re-run). Attribution text in the app footer and map.
- [x] P0-08 (S) `pnpm db:types`, typed Supabase clients in `lib/supabase` (browser, server, middleware, admin-for-scripts).
- [x] P0-09 (M) pgTAP scaffold and first RLS tests (profiles, friendships). Vitest scaffold with one domain test.
- [x] P0-10 (S) `.env.example`, deploy web to Vercel and migrations to hosted Supabase. Provide the human exact steps for anything that needs their accounts.
- [x] P0-11 (S) docs/DECISIONS.md created with any assumptions so far.

Done when:
1. Human can sign in with Google on the deployed URL and lands on an empty home screen.
2. `select count(*) from places p join areas a on a.id = p.area_id where a.slug = 'bandra-west'` returns more than 0 (adjust slug to what the seed produces).
3. `pnpm lint && pnpm typecheck && pnpm test && pnpm db:test` all pass.
4. Report to the human: how many of their 10 favourite Mumbai places exist in the seed (human supplies the list). If fewer than 6, flag that pin-drop (Phase 5) may need to move earlier.

---

## Phase 1: Core loop (friends, follow, log, place page, feed)

Goal: the whole product sentence works end to end, with relationship labels on every verdict.

- [x] P1-01 (M) Onboarding: unique username (validation, availability check), display name, home area, diet preference (veg / jain / halal / egg / non-veg, multi-select), account privacy (default public), default entry visibility. Redirect incomplete profiles here.
- [x] P1-02 (L) Friend system: send request, accept, decline, cancel, unfriend. `/friends` with tabs Friends, Requests, Find (search by username). Notifications are in-app badges only for now.
- [x] P1-03 (M) Invite links: create, revoke, expire after 7 days, max 20 uses. `/invite/[code]` creates a friendship immediately (inviter pre-consented by creating the link). WhatsApp share via `wa.me` prefilled text with Web Share API fallback.
- [x] P1-04 (M) Follow system: follow, unfollow, follow requests for private accounts, approve/reject, followers and following lists.
- [x] P1-05 (M) Block and report: block hides both directions everywhere; report a user or a visit with a reason; `/admin/reports` list behind an admin flag.
- [x] P1-06 (M) Place search over our own `places` table: trigram name match plus proximity bias if location is granted (optional). Recent searches stored locally. Google fallback exists behind env flag `GOOGLE_PLACES_ENABLED`, off by default.
- [x] P1-07 (L) Place page per UI_UX.md: header (name, area, diet badges), TierSummary (Friends / Following / Everyone, separate counts), filter toggle, VerdictCards with RelationshipTag, Everyone tier collapsed, empty states with nudges, handoff button per PLACES_DATA.md.
- [x] P1-08 (L) Log flow (bottom sheet): pick place, tap Go / Skip / Only for (with one short free-text for "only for"), visibility selector showing who can see it, save. Success state. Repeat visits allowed. Only the verdict is required.
- [x] P1-09 (M) Hook `recompute_visit_flags(user_id)` (SCORING_BADGES.md) to run after visit insert/delete so the flags are correct from day one. No score UI yet.
- [x] P1-10 (M) Home feed: tabs Friends and Following, cursor pagination, relationship tags, empty states that explain how to add friends.
- [x] P1-11 (M) Profile pages (own and others): header, relationship buttons by state, recent verdicts (RLS-filtered), counts.
- [x] P1-12 (S) PWA manifest, icons, theme colour, install-friendly meta. No service worker yet.
- [x] P1-13 (M) Dev seed (`supabase/seed.sql` or script): users covering every relationship type (friend, following, blocked, private account, stranger) and visits at every visibility level.
- [x] P1-14 (M) RLS test matrix: for each visibility level x each viewer relationship, assert allowed or denied. Also blocked and private-account cases.

Done when (manual scenario, three test accounts A, B, C):
1. A and B become friends via an invite link. C follows A (public account).
2. A logs a visit with visibility Friends to place P, B logs Go on P with visibility Followers, C logs Skip on P with visibility Public.
3. B opens P: sees A's verdict tagged FRIEND, C's tagged Public or Following as appropriate; counts are shown per tier and never merged.
4. C opens P: does not see A's Friends-only verdict, sees B's Followers verdict only if C follows B.
5. A blocks C: neither sees the other anywhere. A new user with zero friends still gets a useful place page within 2 minutes.
6. Logging with only the verdict takes under 10 seconds on a phone.

Checkpoint for the human: do friends log a second visit unprompted? If not, fix the logging flow before Phase 2.

---

## Phase 2: Discover people

Goal: a user with no friends can find relevant people to follow in minute one.

- [x] P2-01 (M) Discover tab: people search by name or username.
- [x] P2-02 (M) Browse people by area, by food type (cuisine tags from their visits), by diet. Computed from visit data, respecting visibility.
- [x] P2-03 (L) Taste match: agreement rate on places both users visited, shown only after 5 or more shared places. Computed by SQL function plus nightly refresh and lazy refresh on profile view. Used to rank the Following tier. (Ranking deferred, see DECISIONS.md, Phase 2.)
- [x] P2-04 (M) Suggestions: after logging a place, "N others logged this, follow them?"; friends-of-friends "people you may know".
- [x] P2-05 (S) Profile stats: visits count, areas covered, followers and following counts.
- [x] P2-06 (S) Onboarding step: follow 5 suggested accounts (suggestions come from real users only; if there are fewer than 5, show fewer and skip).
- [x] P2-07 (S) Contacts match: NOT building on web for now. The Contact Picker API is limited to some Android browsers and phone-number matching needs phone auth. Replace with invite links and friends-of-friends. Record this in DECISIONS.md.

Done when: a new user finds and follows 5 relevant people without being told whom, and taste match never shows below the 5-place threshold.

Human to-do before testing: log 50 to 100 real Mumbai places yourself and invite about 20 early users so Discover is not empty.

---

## Phase 3: Optional groups

Goal: named buckets of friends (Family, College gang) layered on top of friendships.

- [x] P3-01 (M) Create group, invite link, join. Members must already be friends of the owner (DB trigger enforces).
- [x] P3-02 (S) Roles: owner, member. Leave group. Owner can remove members and delete group.
- [x] P3-03 (M) Group tag on VerdictCards (shows a group the viewer and author share).
- [x] P3-04 (M) Audience groups on a visit: share a Friends visit with specific groups only ("Family says Go"). Enforced in RLS.
- [x] P3-05 (M) Group feed tab and group page.
- [x] P3-06 (S) Family-friendly defaults: groups private, no leaderboard unless the owner enables it later (Phase 6).

Done when: a family group can be created, and a verdict shared to Family only is visible to Family members and nobody else, including other friends.

---

## Phase 4: Depth, one tap away

Goal: detail exists but never slows the 10-second flow.

- [x] P4-01 (M) Optional step after the verdict: best-dish chips, price-per-head slider (INR, budget / mid / splurge labels), occasion chips (family dinner, date, group of 10, late night, post-exam, pure-veg family).
- [x] P4-02 (M) "Add more" screen: free note (Hinglish allowed, no language restriction), per-dish verdicts, photos.
- [x] P4-03 (M) Photo upload to Supabase Storage with client-side compression (WebP, max 1280px long edge, target under 300 KB).
- [x] P4-04 (M) Collapsed VerdictCard expands on tap to show note, dishes, photos.
- [x] P4-05 (M) Top dishes per tier on the place page (aggregated from dish verdicts; tiers still separate).
- [x] P4-06 (S) Edit and delete own review layer. Deleting a review keeps the visit and its point.
- [x] P4-07 (S) Remember last visibility choice per user.

Done when: verdict-only logging is still under 10 seconds, a detailed review takes under 60 seconds, and photos never exceed the size target.

---

## Phase 5: Pin-drop, diary, logbook

Goal: a reason to open the app when not searching, and data quality for scoring.

- [ ] P5-01 (L) Pin-drop to add a place (MapLibre): name, type, diet flags, cuisine tags, area auto-resolved from the pin.
- [ ] P5-02 (L) Duplicate detection per PLACES_DATA.md: nearby (about 50 m) plus fuzzy name match, "Is this the same as X?" prompt before creating.
- [ ] P5-03 (S) Place status flow: unverified becomes confirmed after 2 different users log it.
- [ ] P5-04 (M) Admin merge tool `/admin/places/merge`: merge A into B, move visits, recompute affected users' flags.
- [ ] P5-05 (S) "Report closed or moved" and "Know this? Suggest" (diet flags, cuisine, type) on places via `place_suggestions`, with an admin screen to apply or dismiss.
- [ ] P5-06 (M) Diary timeline (newest first), diary map (pins across Mumbai), "On this day".
- [ ] P5-07 (M) Memory layer on a visit: companions, occasion, private note, photos, mood. Default Private.
- [ ] P5-08 (M) Companion tagging: tagged friend gets "Add to your log?". Tagging alone gives no points.
- [ ] P5-09 (M) Backdating: allowed, flagged, counts toward all-time only (rules live in SQL already).
- [ ] P5-10 (M) Logbook counts: places by area, areas covered, places by cuisine.
- [ ] P5-11 (M) "Want to go" list (added 2026-11-03 at the human's request): save a place from its page or from a friend's verdict; private by default; never earns points; logging a visit moves it from Want to go to Been. The diary map (P5-06) shows both, distinguished by colour plus a text label/icon, with a Been / Want to go / Both toggle.

Done when: a user drops a pin for a vada pav stall, sees it on their map, saves another place as Want to go and sees it as a different pin, and a second user logging the same stall is matched to it instead of creating a duplicate; an admin merge moves visits and fixes counts.

---

## Phase 6: Competition and badges

Goal: friendly competition that rewards exploring, not review spam.

- [ ] P6-01 (M) Surface scores from the `user_scores` cache. Verify caps and flags with tests (see SCORING_BADGES.md).
- [ ] P6-02 (L) Leaderboards: friends (default), groups (opt-in per group), followed people (opt-in). Weekly, monthly, all-time. NO Mumbai-wide board.
- [ ] P6-03 (S) Post-log feedback: "New place! +1. Aarav is 2 ahead of you."
- [ ] P6-04 (L) Badge engine (rule-based, rules in DB). First set: Bandra Native, Suburb Surveyor, Thela Hunter, First Finder, Honest Critic.
- [ ] P6-05 (M) Weekly new-place streak with a grace week.
- [ ] P6-06 (M) Profile page: level, badges, counts. Badges shown beside the name on verdict cards.
- [ ] P6-07 (M) Optional verified visit (device location near the pin). Never blocks logging; verified visits break ties.

Done when: a group of 5+ runs a month-long leaderboard, repeating one cafe does not add points, chain cap and daily cap work, and backdated visits count only toward all-time.

---

## Phase 7: India polish and growth

- [ ] P7-01 (M) Full India badge set: Local Train Foodie, Vada Pav Veteran, Irani Chai Regular, Thali Master, Trusted Taster (friend acted on your verdict, weighted higher than a stranger).
- [ ] P7-02 (M) Area boards within a friend circle or group ("Bandra Explorer").
- [ ] P7-03 (M) Year recap page.
- [ ] P7-04 (M) Shareable cards (logbook, badge, recap) as images via `next/og`, tuned for WhatsApp and Instagram stories.
- [ ] P7-05 (L) Full PWA: service worker, offline diary reading, install prompt, web push for friend activity.
- [ ] P7-06 (M) Hinglish input polish; voice notes as a time-boxed experiment.
- [ ] P7-07 (M) Analytics and error tracking (privacy-respecting, no PII in events).
- [ ] P7-08 (L) Phone OTP sign-in, only if SMS cost and registration requirements are acceptable (the human decides).

Done when: a shared recap card looks right in a WhatsApp preview, push notifications arrive on Android Chrome, and the app is installable.

---

## Launch plan (human-run, alongside the phases)

```
after Phase 1   5 to 10 closest friends
after Phase 2   whole friend cluster, about 30
after Phase 3   add 3 to 5 families to test the Family idea
after Phase 6   wider batch / hostel, leaderboards as the hook
```

Do not market to all of Mumbai early. Thirty people who log weekly beat 3,000 who tried it once.

Metrics to watch: visits logged per active user per week; share of users who log a second visit within 7 days; share of place-page views that show at least one friend verdict; circles with 3+ active members; duplicate places created vs merged.
