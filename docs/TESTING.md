# TESTING.md

Testing priorities follow the risk: privacy leaks and scoring bugs hurt most, visual bugs least. Do not skip the database tests to save time.

## 1. Layers

```
pgTAP (supabase test db)   RLS policies, security-definer RPCs, scoring functions, triggers
Vitest                     lib/domain pure logic, Zod schemas, handoff link builder, copy helpers
Playwright                 a few end-to-end smoke flows at a 390x844 viewport
Manual on a real phone     the Done-when scenarios in PHASES.md
```

## 2. pgTAP test files (supabase/tests)

```
rls_profiles.test.sql
rls_social.test.sql            friendships, follows, blocks: direct writes rejected, reads own rows only
rls_visits_matrix.test.sql     every visibility x relationship case from SECURITY_PRIVACY.md section 3
rls_visits_private_account.test.sql
rls_reviews_memories.test.sql  review layer follows visit visibility; memories stricter; memory photos not leaked
rls_groups.test.sql            membership, audience groups, non-friend member rejected
rpc_summary_feed.test.sql      summary and verdict lists respect visibility, blocks, tiers; never blended
rpc_invites.test.sql           expiry, revoke, max uses, double redeem, blocked pair
rpc_places.test.sql            search ranking basics, candidates, create_place dedupe, merge recompute
scoring.test.sql               every rule in SCORING_BADGES.md section 9
leaderboard.test.sql           scope, opt-out, private visits excluded, blocked excluded
column_grants.test.sql         client cannot set flags, verified, is_admin
```

Test helper: a SQL function or setup block that creates users and sets `request.jwt.claims` so `auth.uid()` returns the test user. Write the helper once in `supabase/tests/_helpers.sql`.

Matrix test shape: create author A with visits at all four visibilities, then for each viewer (self, friend, accepted follower, pending follower, stranger, blocked) assert the exact set of visible visit ids. Repeat for a private-account author and for a friends-visibility visit with audience groups.

## 3. Vitest

```
lib/domain/tiers.test.ts           ordering rules, tier labels, never merges tiers
lib/domain/summary.test.ts         summary copy ("2 Go, 1 Skip"), singular/plural, empty states
lib/domain/visibility.test.ts      default visibility by account type, "who can see this" sentence
lib/validation/*.test.ts           Zod schemas (log visit, onboarding, place creation)
lib/handoff.test.ts                URL building, hidden when type/status disallow
lib/date.test.ts                   IST helpers (today, week start, month start)
```

## 4. Playwright smoke tests (mobile viewport)

```
auth.spec.ts           login page renders; authenticated session reaches home (use a test session helper)
log-flow.spec.ts       search a place, tap Go, success state, verdict appears on place page
tiers.spec.ts          seeded users: friend verdict above follower verdict, tags visible, counts separate
friends.spec.ts        send request, accept, see friend verdict
a11y.spec.ts           axe checks on login, home, place, log sheet
```

Run against local Supabase with the dev seed. Keep them few and stable.

## 5. Quality gates (every task)

```
pnpm lint && pnpm typecheck && pnpm test
pnpm db:test            when the database changed
pnpm test:e2e           at the end of each phase
```

A phase is not done until all gates pass and the Done-when scenario in PHASES.md has been walked through.

## 6. Performance and mobile checks (end of Phases 1, 4, 5)

- Lighthouse mobile on home and place pages: performance, accessibility, best practices scores noted in docs/DECISIONS.md.
- Throttled "Slow 4G" run of the log flow; it must feel usable.
- Photo upload: confirm output size is under about 300 KB and EXIF is stripped.
- Test on one real Android phone and one iPhone in Safari (installable PWA, bottom sheet behaviour, input zoom).

## 7. Data safety checks

- No `SUPABASE_SERVICE_ROLE_KEY` in client bundles (grep the build output).
- No user content in server logs or analytics events.
- Dev seed never runs against the hosted production project.

## 8. Regression rule

Every bug that reaches the human gets a regression test (pgTAP for database logic, Vitest for domain logic, Playwright only if it was a flow bug) before the fix is merged.
