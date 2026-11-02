# API_SPEC.md

Interfaces between the Next.js app and Supabase. Three layers:

1. Postgres RPC functions: anything that depends on the viewer's relationship, or that must be atomic.
2. Server Actions: mutations called from the UI; validate with Zod, call RPCs or tables with the user's session.
3. Route handlers: only where a server action does not fit (auth callback, OG images, webhooks).

All RPCs call `auth.uid()`; they raise `not_authenticated` if null. Types come from `pnpm db:types`; never hand-write them. Errors raised by RPCs use stable message codes (for example `rate_limited`, `blocked`, `not_found`, `forbidden`) that the UI maps to friendly copy in `lib/copy.ts`.

## 1. RPCs

### Places and verdicts

```
search_places(p_query text, p_lat double, p_lng double, p_limit int) -> rows
  PLACES_DATA.md. Phase 1.

get_place(p_place uuid) -> { id, name, area, type, diet_flags, cuisine_tags, status, merged_into, brand }
  Follows merged_into so the UI can redirect.

get_place_summary(p_place uuid) -> rows (tier, went, go_count, skip_count, only_for_count)
  tier 0 = you, 1 = friends, 2 = following, 3 = everyone. One row per tier present.
  Counts one entry per author: their most recent visit the viewer can see.
  Tiers are never merged. Never returns a blended total.

get_place_verdicts(p_place uuid, p_tier_filter text default 'friends_following',
                   p_limit int default 20, p_cursor_ts timestamptz default null, p_cursor_id uuid default null)
  -> rows (visit_id, author_id, username, display_name, avatar_url, tier, group_name,
           verdict, only_for_text, visited_on, logged_at, badges jsonb)
  p_tier_filter: 'friends' | 'friends_following' | 'everyone'.
  Ordering: tier ascending, then (tier 2) taste match desc, then logged_at desc.
  Cursor pagination on (tier, logged_at, id).
  Only rows where can_view_visit(...) is true. Excludes blocked users. One row per author (latest visible).
```

Reference implementation of the summary (adapt, test, keep semantics):

```sql
create or replace function get_place_summary(p_place uuid)
returns table (tier smallint, went int, go_count int, skip_count int, only_for_count int)
language sql stable security definer set search_path = public, extensions as $$
  with latest as (
    select distinct on (v.user_id) v.user_id, v.verdict
    from visits v
    where v.place_id = p_place
      and can_view_visit(auth.uid(), v.id, v.user_id, v.visibility)
    order by v.user_id, v.visited_on desc, v.logged_at desc
  ), tiered as (
    select l.verdict, relationship_tier(auth.uid(), l.user_id) as tier from latest l
  )
  select t.tier, count(*)::int,
         count(*) filter (where t.verdict = 'go')::int,
         count(*) filter (where t.verdict = 'skip')::int,
         count(*) filter (where t.verdict = 'only_for')::int
  from tiered t where t.tier is not null
  group by t.tier order by t.tier;
$$;
```

### Feed

```
get_home_feed(p_tab text, p_limit int default 20, p_cursor_ts timestamptz default null, p_cursor_id uuid default null)
  p_tab: 'friends' | 'following' | 'group:<uuid>' (Phase 3)
  -> rows (visit_id, author, tier, place {id,name,area}, verdict, only_for_text, logged_at, review_summary)
  Only visits the viewer can see; blocked users excluded; muted friends excluded.
```

### Social graph (all security definer, rate limited)

```
request_friend(p_target uuid)                 creates pending; if the other side already requested, accepts
respond_friend(p_other uuid, p_accept boolean) only the non-requesting side can respond
cancel_friend_request(p_other uuid)
remove_friend(p_other uuid)                   also removes group memberships that depended on it
follow_user(p_target uuid)                    status pending if target is private, else accepted
unfollow_user(p_target uuid)
respond_follow(p_follower uuid, p_accept boolean)
remove_follower(p_follower uuid)
block_user(p_target uuid)                     deletes friendship, follows both ways, group links; inserts block
unblock_user(p_target uuid)
create_invite(p_kind invite_kind, p_group uuid default null) -> { code, url, expires_at }
revoke_invite(p_invite uuid)
redeem_invite(p_code text) -> { kind, inviter, group }
  friend kind: creates an accepted friendship immediately (inviter pre-consented). Validates not expired,
  not revoked, uses < max_uses, not already redeemed by this user, no block between the two.
  group kind: requires the redeemer to be a friend of the owner, otherwise returns
  { "status": "needs_friendship" } and offers to become friends via the same inviter first.
```

### Visits and scoring

```
Direct insert into visits (RLS + column grants):
  user_id, place_id, visited_on, verdict, only_for_text, visibility.
  After insert the client re-reads its own row to get the computed flags for "+1" feedback.

verify_visit(p_visit uuid, p_lat double, p_lng double) -> boolean
  Security definer. Sets verified = true if the point is within 150 m of the place and the visit is
  today (IST) and owned by the caller. Discards the coordinates. Never blocks logging.

get_leaderboard(p_scope text, p_group uuid, p_period score_period, p_period_start date)
  SCORING_BADGES.md. Phase 6.

get_my_scores() -> rows from user_scores for the caller
```

### Discover (Phase 2)

```
get_discover_people(p_kind text, p_param text default null, p_limit int default 20)
  p_kind: 'taste' | 'area' | 'cuisine' | 'diet' | 'friends_of_friends' | 'search'
  -> rows (profile fields, relationship state, shared_places, match_rate nullable, top_areas)
  Excludes self, blocked users, existing friends. Private accounts are listed by basic profile only.
  match_rate is returned only when shared_places >= 5.

suggest_people_after_log(p_place uuid, p_limit int default 5)
  People who logged this place (and are visible to the viewer) whom the viewer does not follow.

refresh_taste_matches(p_user uuid default null)
  Recomputes for one user or all (nightly). Agreement = both Go, or both Skip, on the same place using
  each person's most recent visit; Only-for counts as agreement with Go on that place only if both
  chose only_for. rate = agreed / shared * 100. Only compares visits visible to each pair
  (non-private for both).
```

### Groups (Phase 3)

```
create_group(p_name text, p_kind text) -> uuid
add_group_member(p_group uuid, p_user uuid)    owner only, member must be a friend of the owner
remove_group_member(p_group uuid, p_user uuid) owner, or the member themself (leave)
delete_group(p_group uuid)                     owner only
set_visit_audience_groups(p_visit uuid, p_groups uuid[])
```

### Depth, diary, logbook (Phases 4 and 5)

```
get_place_top_dishes(p_place uuid, p_tier_filter text) -> rows (dish, go_count, skip_count, tier)
  Per tier, never blended.

get_diary(p_year int default null, p_cursor_ts timestamptz default null, p_limit int default 30)
  The caller's own visits (all visibilities) with place and memory.

get_diary_map() -> rows (place_id, name, lat, lng, visit_count, last_visited_on)
get_on_this_day() -> rows from previous years
get_logbook_counts() -> { by_area[], areas_covered, by_cuisine[], total_places }
get_year_recap(p_year int)   Phase 7
```

### Places (Phases 1 and 5)

```
find_place_candidates(...), create_place(...)   PLACES_DATA.md
suggest_place_edit(p_place uuid, p_field text, p_value jsonb)
merge_places(p_source uuid, p_target uuid)      admin
admin_update_place(p_place uuid, p_patch jsonb) admin, audited
```

### Moderation and admin

```
report_content(p_type report_target, p_id uuid, p_reason text)
admin_list_reports(p_status report_status default 'open')
admin_resolve_report(p_report uuid, p_status report_status, p_note text)
admin_hide_visit(p_visit uuid)
```

## 2. Server Actions (lib/actions)

Each action: parse with Zod, check session, call RPC or table, return `{ ok: true, data } | { ok: false, code, message }`, `revalidatePath` where needed.

```
auth/       signOut
profile/    completeOnboarding, updateProfile, updateVisibilityDefaults, deleteAccount
social/     requestFriend, respondFriend, removeFriend, follow, unfollow, respondFollow,
            blockUser, unblockUser, createInvite, revokeInvite, redeemInvite
visits/     logVisit, updateVisit, deleteVisit, setVisitVisibility, verifyVisit
reviews/    saveReviewLayer, deleteReviewLayer, uploadPhoto (signed upload URL), removePhoto
memories/   saveMemory, tagCompanion, respondCompanion
places/     createPlace, suggestPlaceEdit, reportPlace
groups/     createGroup, addMember, removeMember, leaveGroup, deleteGroup, setAudienceGroups
moderation/ reportContent
admin/      mergePlaces, updatePlace, resolveReport, hideVisit
```

Zod schema for the core action (example):

```ts
export const logVisitInput = z.object({
  placeId: z.string().uuid(),
  verdict: z.enum(['go', 'skip', 'only_for']),
  onlyForText: z.string().trim().max(60).optional(),
  visibility: z.enum(['private', 'friends', 'followers', 'public']),
  visitedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // IST date; defaults to today
}).refine(v => v.verdict === 'only_for' || !v.onlyForText, { message: 'onlyForText only with only_for' });
```

## 3. Route handlers

```
GET  /auth/callback               Supabase OAuth code exchange, then redirect (onboarding or home)
GET  /invite/[code]               page (not an API): redeem after login, preserve the code through login
GET  /api/og/recap/[year]         Phase 7 share card image (next/og)
GET  /api/og/badge/[slug]         Phase 7
POST /api/push/subscribe          Phase 7 web push subscription
POST /api/cron/refresh-matches    Phase 2, secured with a secret header, run nightly (Vercel Cron or Supabase scheduled function)
```

## 4. Page-level data needs

```
Home         get_home_feed(tab)
Search       search_places
Place        get_place, get_place_summary, get_place_verdicts, (P4) get_place_top_dishes
Log sheet    place from search, insert visit, (P5) create_place
Profile      profiles row, relationship state (own friendships/follows), recent visits (RLS)
Friends      friendships, follows (own rows), invites (own)
Discover     get_discover_people
Diary        get_diary, get_diary_map, get_on_this_day, get_logbook_counts
Leaderboard  get_leaderboard
```

## 5. Error codes (stable strings)

```
not_authenticated, forbidden, not_found, blocked, rate_limited, invalid_input,
already_friends, request_pending, invite_expired, invite_revoked, invite_used_up,
needs_friendship, duplicate_candidates, place_merged, future_date, group_full
```

Map each to a friendly sentence in `lib/copy.ts`. Never show raw database errors to users.
