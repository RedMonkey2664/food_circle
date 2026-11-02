# ARCHITECTURE.md

## 1. Overview

```
Phone browser (PWA)
      |
      v
Next.js on Vercel  ----- server actions / route handlers -----+
 (RSC + client islands)                                        |
      |                                                        v
      +---- supabase-js (user session, RLS applies) ---->  Supabase
                                                           Postgres + PostGIS
                                                           Auth (Google)
                                                           Storage (photos)
Scripts (seed, admin) ---- service role key (server only) ---> Supabase

Optional: Google Places autocomplete (flagged, off by default)
Map tiles: OpenStreetMap-based, MapLibre GL
```

Principle: the database is the source of truth for security and scoring. The app is a thin, typed, mobile-first layer on top.

## 2. Stack choices and why

- Next.js App Router: server components keep bundles small on slow mobile data; server actions simplify mutations.
- Supabase: Postgres with RLS gives real privacy guarantees; PostGIS for distance and area queries; Auth and Storage included.
- MapLibre GL: free, no API key needed for the library; load lazily only on map screens.
- Tailwind: fast mobile-first styling with design tokens.
- Zod + generated DB types: safe boundaries, no hand-written types for the DB.

Verify current free-tier limits of Vercel and Supabase before launch; they change.

## 3. Repo structure

```
/app
  (auth)/login/page.tsx
  (auth)/onboarding/page.tsx
  (app)/layout.tsx                 bottom nav, session guard
  (app)/page.tsx                   home feed
  (app)/search/page.tsx
  (app)/place/[id]/page.tsx
  (app)/log/page.tsx               also opened as a sheet from anywhere
  (app)/discover/page.tsx          Phase 2
  (app)/u/[username]/page.tsx
  (app)/friends/page.tsx
  (app)/groups/page.tsx            Phase 3
  (app)/groups/[id]/page.tsx       Phase 3
  (app)/diary/page.tsx             Phase 5
  (app)/diary/map/page.tsx         Phase 5
  (app)/leaderboard/page.tsx       Phase 6
  (app)/settings/page.tsx
  invite/[code]/page.tsx
  (admin)/admin/reports/page.tsx
  (admin)/admin/places/merge/page.tsx
  api/                             only where a route handler is needed (webhooks, og images)
/components
  ui/                              Button, Card, Sheet, Tag, Chip, Skeleton
  verdict/                         VerdictButtons, VerdictCard, TierSummary, RelationshipTag
  place/                           PlaceHeader, DietBadges, PlaceSearch, HandoffButton
  social/                          FriendButton, FollowButton, PersonRow
  map/                             MapView, PinDropper (lazy loaded)
/lib
  supabase/                        client.ts, server.ts, middleware.ts, admin.ts
  domain/                          tiers.ts, visibility.ts, summary.ts, scoring-copy.ts
  validation/                      zod schemas
  actions/                         server actions grouped by feature
  copy.ts                          all user-facing strings
  config.ts                        APP_NAME and feature flags
  handoff.ts                       Swiggy/Zomato link builders
/supabase
  migrations/                      timestamped SQL
  seed.sql                         dev seed (clearly fake data)
  tests/                           pgTAP tests
/scripts
  seed-osm.ts
  load-areas.ts
/docs
/public                            icons, manifest
```

## 4. Data access patterns

- Reads that need per-viewer logic (tiers, summaries, feeds, leaderboards) go through Postgres RPC functions (see API_SPEC.md) so ordering and tier assignment cannot drift between screens.
- Simple reads (a profile, a place) use direct table queries; RLS filters rows.
- Mutations use Server Actions that call Supabase with the signed-in user's session. The service-role client is only used in scripts and the admin merge action (after verifying the caller is an admin).
- Pagination: cursor-based (created_at, id). No offset pagination on feeds.
- Revalidate with `revalidatePath` / tags after mutations; optimistic UI for the log sheet and friend/follow buttons.

## 5. Auth and session

- Supabase Auth, Google OAuth provider first. Phone OTP later (SMS costs money and has registration requirements in India; verify before committing).
- Middleware refreshes the session cookie on each request.
- A DB trigger creates the `profiles` row on signup; onboarding fills username and preferences. The `(app)` layout redirects to onboarding until `onboarded_at` is set.
- Admin: `profiles.is_admin` boolean, set manually in the database. Never settable from the client.

## 6. Environment variables (.env.example)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server and scripts only, never NEXT_PUBLIC
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_MAP_STYLE_URL=          # a free OSM-based MapLibre style; see PLACES_DATA.md
GOOGLE_PLACES_ENABLED=false
GOOGLE_PLACES_API_KEY=              # server only, optional
```

Fail fast at boot if a required variable is missing (validate with Zod in `lib/env.ts`).

## 7. Images

- Bucket `review-photos`, private by default. Access via signed URLs generated server-side after an RLS-equivalent check, or storage policies that mirror visit visibility.
- Client-side compression before upload: WebP, longest edge 1280px, target under 300 KB. Reject files over 10 MB before compressing.
- Strip EXIF location data on the client before upload.

## 8. Maps

- MapLibre GL with OSM-based tiles. Show the required attribution ("© OpenStreetMap contributors") on every map and in the footer.
- Lazy load map components with dynamic import and `ssr: false`.
- Tile server choice: use a provider whose free tier and usage policy allow this (the public tile.openstreetmap.org servers do not permit heavy production use). Make the style URL an env var and confirm terms with the human before launch.

## 9. PWA

- Phase 1: `manifest.webmanifest`, icons, theme colour, `display: standalone`.
- Phase 7: service worker, offline diary reading, push notifications.
- Test installability on Android Chrome and iOS Safari (iOS push has extra requirements; verify).

## 10. Performance budget (mobile, mid-range Android, 4G)

- Largest content paint under 2.5 s on place and home pages.
- Initial JS under about 150 KB gzipped per route, excluding the lazy map.
- No layout shift when verdict cards load (use skeletons).
- Search results respond under 300 ms for the seed dataset (trigram index required).

## 11. Observability and errors

- Structured server logs; no personal data in logs.
- Error boundary per route group with a friendly message and retry.
- Phase 7: error tracking and privacy-respecting analytics. Event names listed in docs/DECISIONS.md when added; never log notes, photos or exact locations.

## 12. Feature flags

Simple constants in `lib/config.ts` reading env vars. Initial flags: `GOOGLE_PLACES_ENABLED`, `HANDOFF_SWIGGY_ENABLED`, `HANDOFF_ZOMATO_ENABLED` (both off until link formats are verified on real devices), `LEADERBOARDS_ENABLED`.

## 13. Security basics

- All tables have RLS (SECURITY_PRIVACY.md).
- CSRF: server actions only from same origin; no state-changing GET routes.
- Rate limit sensitive actions (friend requests, reports, invite creation) in the database or edge middleware; a simple per-user daily cap is enough initially.
- Sanitize and length-limit all free text; render as plain text, never as HTML.

## 14. Deployment

- Vercel project connected to the GitHub repo; preview deployments for branches.
- Supabase migrations applied with `supabase db push` to the hosted project; never edit the hosted schema by hand.
- Keep a staging Supabase project if budget allows; otherwise test migrations locally with `pnpm db:reset` first.
