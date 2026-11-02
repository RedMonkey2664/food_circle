# SECURITY_PRIVACY.md

Privacy is enforced in Postgres with Row Level Security, not only in the UI. A UI bug must not be able to leak a friends-only entry.

## 1. Principles

1. RLS enabled on every table in `public`. No table without at least a deliberate policy (or deliberately none, meaning RPC-only access).
2. Clients never write computed or privileged columns (score flags, verified, is_admin, merged state).
3. Relationship changes (friend, follow, block, invite redemption) happen only through `security definer` RPCs that validate everything.
4. Narrower audience wins by default.
5. Every policy has a pgTAP test (TESTING.md).

## 2. Helper functions (migration 0008)

```sql
create or replace function are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from friendships f
    where f.user_low = least(a,b) and f.user_high = greatest(a,b) and f.status = 'accepted');
$$;

create or replace function is_following(viewer uuid, author uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from follows f
    where f.follower_id = viewer and f.following_id = author and f.status = 'accepted');
$$;

create or replace function is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- 0 self, 1 friend, 2 following, 3 everyone, null when blocked or anonymous
create or replace function relationship_tier(viewer uuid, author uuid) returns smallint
language sql stable security definer set search_path = public, extensions as $$
  select case
    when viewer is null then null
    when viewer = author then 0
    when is_blocked_between(viewer, author) then null
    when are_friends(viewer, author) then 1
    when is_following(viewer, author) then 2
    else 3 end::smallint;
$$;

create or replace function can_view_visit(viewer uuid, v_id uuid, v_author uuid, v_vis visibility)
returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select case
    when viewer is null then false
    when viewer = v_author then true
    when is_blocked_between(viewer, v_author) then false
    when v_vis = 'private' then false
    when v_vis = 'friends' then
      are_friends(viewer, v_author)
      and (
        not exists (select 1 from visit_audience_groups g where g.visit_id = v_id)
        or exists (select 1 from visit_audience_groups g
                   join group_members m on m.group_id = g.group_id
                   where g.visit_id = v_id and m.user_id = viewer)
      )
    when v_vis = 'followers' then
      are_friends(viewer, v_author) or is_following(viewer, v_author)
    when v_vis = 'public' then
      case when (select is_private from profiles where id = v_author)
           then are_friends(viewer, v_author) or is_following(viewer, v_author)
           else true end
    else false
  end;
$$;
```

Anonymous visitors see nothing in Phase 1 (login required to view place pages beyond basic place info).

## 3. Visibility matrix (must be covered by tests)

Viewer relationship to the author, by visit visibility. Public account unless noted.

```
visibility   self  friend  follower(accepted)  follower(pending)  stranger  blocked
private       Y      N         N                    N                N         N
friends       Y      Y         N                    N                N         N
followers     Y      Y         Y                    N                N         N
public        Y      Y         Y                    Y                Y         N

Private account (author.is_private = true):
public        Y      Y         Y                    N                N         N
```

With audience groups set on a friends-visibility visit: only friends who are members of an audience group (plus the author).

## 4. Policies (migration 0012)

```sql
alter table profiles enable row level security;
create policy profiles_select on profiles for select to authenticated
  using (not is_blocked_between(auth.uid(), id));
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- is_admin changes blocked by trigger prevent_admin_escalation (only service role may change it)

alter table friendships enable row level security;
create policy friendships_select on friendships for select to authenticated
  using (auth.uid() in (user_low, user_high));
-- no insert/update/delete policies: RPC only

alter table follows enable row level security;
create policy follows_select on follows for select to authenticated
  using (auth.uid() in (follower_id, following_id));
-- RPC only for writes

alter table blocks enable row level security;
create policy blocks_select_own on blocks for select to authenticated using (blocker_id = auth.uid());
-- RPC only for writes (block_user also removes friendships and follows both ways)

alter table mutes enable row level security;
create policy mutes_own on mutes for all to authenticated
  using (muter_id = auth.uid()) with check (muter_id = auth.uid());

alter table reports enable row level security;
create policy reports_insert on reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_select_admin on reports for select to authenticated using (is_admin());
create policy reports_update_admin on reports for update to authenticated using (is_admin());

alter table places enable row level security;
create policy places_select on places for select to authenticated using (true);
-- inserts only via create_place RPC; updates/merges only via admin RPCs

alter table areas enable row level security;
create policy areas_select on areas for select to authenticated using (true);
alter table brands enable row level security;
create policy brands_select on brands for select to authenticated using (true);

alter table visits enable row level security;
create policy visits_select on visits for select to authenticated
  using (can_view_visit(auth.uid(), id, user_id, visibility));
create policy visits_insert_own on visits for insert to authenticated
  with check (user_id = auth.uid());
create policy visits_update_own on visits for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy visits_delete_own on visits for delete to authenticated
  using (user_id = auth.uid());

-- Column-level privileges: clients cannot write computed or privileged columns
revoke insert, update on visits from authenticated, anon;
grant insert (user_id, place_id, visited_on, verdict, only_for_text, visibility) on visits to authenticated;
grant update (visited_on, verdict, only_for_text, visibility) on visits to authenticated;

alter table reviews enable row level security;
create policy reviews_select on reviews for select to authenticated using (
  exists (select 1 from visits v where v.id = visit_id
          and can_view_visit(auth.uid(), v.id, v.user_id, v.visibility)));
create policy reviews_write_own on reviews for all to authenticated
  using (exists (select 1 from visits v where v.id = visit_id and v.user_id = auth.uid()))
  with check (exists (select 1 from visits v where v.id = visit_id and v.user_id = auth.uid()));

-- review_dishes follows the same two policies as reviews.
-- visit_photos: same, but rows with kind = 'memory' are visible only per memories.visibility (below).

alter table memories enable row level security;
create policy memories_select on memories for select to authenticated using (
  exists (select 1 from visits v where v.id = visit_id and (
    v.user_id = auth.uid()
    or (memories.visibility = 'friends'
        and are_friends(auth.uid(), v.user_id)
        and can_view_visit(auth.uid(), v.id, v.user_id, v.visibility)))));
create policy memories_write_own on memories for all to authenticated
  using (exists (select 1 from visits v where v.id = visit_id and v.user_id = auth.uid()))
  with check (exists (select 1 from visits v where v.id = visit_id and v.user_id = auth.uid()));

alter table visit_companions enable row level security;
create policy companions_select on visit_companions for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from visits v where v.id = visit_id
             and (v.user_id = auth.uid() or are_friends(auth.uid(), v.user_id))));
create policy companions_insert_author on visit_companions for insert to authenticated
  with check (exists (select 1 from visits v where v.id = visit_id and v.user_id = auth.uid()
                      and are_friends(auth.uid(), user_id)));
create policy companions_update_tagged on visit_companions for update to authenticated
  using (user_id = auth.uid());   -- tagged user can mark 'added' or 'dismissed'

alter table groups enable row level security;
create policy groups_select_member on groups for select to authenticated using (
  exists (select 1 from group_members m where m.group_id = id and m.user_id = auth.uid()));
-- create/update/delete via RPC or owner-only policies; membership via RPC

alter table group_members enable row level security;
create policy gm_select_same_group on group_members for select to authenticated using (
  exists (select 1 from group_members m where m.group_id = group_members.group_id and m.user_id = auth.uid()));

alter table invites enable row level security;
create policy invites_select_own on invites for select to authenticated using (created_by = auth.uid());
-- redeem_invite RPC reads by code with security definer

alter table user_scores enable row level security;
create policy scores_select_own on user_scores for select to authenticated using (user_id = auth.uid());
-- others' scores only through get_leaderboard RPC (respects scope and visibility)

alter table user_streaks enable row level security;
create policy streaks_select_own on user_streaks for select to authenticated using (user_id = auth.uid());

alter table badges enable row level security;
create policy badges_select on badges for select to authenticated using (true);
alter table user_badges enable row level security;
create policy user_badges_select on user_badges for select to authenticated
  using (not is_blocked_between(auth.uid(), user_id));

alter table taste_matches enable row level security;
create policy taste_select on taste_matches for select to authenticated
  using (auth.uid() in (user_a, user_b));

alter table place_suggestions enable row level security;
create policy suggestions_insert on place_suggestions for insert to authenticated with check (user_id = auth.uid());
create policy suggestions_select on place_suggestions for select to authenticated using (user_id = auth.uid() or is_admin());

alter table admin_audit enable row level security;
create policy audit_select_admin on admin_audit for select to authenticated using (is_admin());
```

Note on `memories` and `visit_photos(kind='memory')`: a memory photo is never more visible than its memory; `visit_photos` select policy must check kind and the memory visibility, not just the visit visibility.

## 5. Storage

- Bucket `review-photos`, private. Object path: `{user_id}/{visit_id}/{uuid}.webp`.
- Storage policy: insert and delete only when `(storage.foldername(name))[1] = auth.uid()::text`.
- Reads: the server creates short-lived signed URLs only after confirming the viewer can see the related visit (and memory if kind = memory). Never expose public bucket URLs.
- Strip EXIF (including GPS) client-side before upload. Limit 6 photos per visit.

## 6. RPC security rules

- Every `security definer` RPC sets `search_path`, validates `auth.uid()` is not null, and validates all arguments.
- Leaderboard, summary, feed and discover RPCs apply `can_view_visit` or the equivalent filter internally; they must never return rows or counts that include data the viewer cannot see. Test this.
- Invite codes: at least 22 random url-safe characters, rate-limited redemption, expiry and revoke honoured.
- Admin RPCs call `is_admin()` and write to `admin_audit`.

## 7. Abuse prevention and rate limits (database-level)

Simple per-user daily caps enforced in RPCs or triggers (tune later):

```
friend requests sent     30 / day
follows                  100 / day
reports                  20 / day
invites created          10 / day
places created           20 / day
visits logged            60 / day   (separate from the scoring cap of 5 new counted places)
```

Reject with a clear, friendly error. Log rejections without personal data.

## 8. Moderation

- Report user, visit, or place with a reason. Admin list at `/admin/reports` with actions: dismiss, hide visit (set visibility private and flag), close place, ban user (admin sets a flag; see below), all written to `admin_audit`.
- Block: removes friendship and follows in both directions, hides each user from the other in profiles, feeds, summaries, leaderboards, discover and search.
- Mute (friend menu): hides a friend's items from your own feed without telling them (`mutes` table). Optional in Phase 1.
- Banned users: `profiles.banned_at` is set by an admin; RLS insert policies and all write RPCs reject banned users.
- Fake or paid reviews: relationship labelling and friend-first ordering limit damage. Add manual review of reports. Do not build automated sentiment or AI moderation in this project phase.

## 9. Personal data

- Collect only: Google account id, name, avatar, email (held by Auth), username, area, diet preference, content the user creates.
- Never collect device contacts. Never store raw location: for verified visits, compare device location to the place on the server and store only the boolean `verified`; discard coordinates.
- Free text is plain text, length-limited, rendered escaped. No HTML or markdown rendering of user content.
- No personal data (notes, photos, usernames, exact times) in analytics events or logs.
- Provide in Settings: change visibility defaults, account privacy, block list, delete account (cascades), and a data export in Phase 7 if time permits.
- Footer shows OpenStreetMap attribution and a privacy note.

## 10. Threats to test explicitly

1. Friends-only visit visible to a follower or stranger (must fail).
2. Blocked user can see anything of the blocker (must fail), including counts.
3. Private account's public visits visible to a non-follower (must fail).
4. Client sets `counts_all_time`, `verified` or `is_admin` (must be rejected).
5. Place summary or leaderboard counts include private or friends-only visits the viewer cannot see (must not).
6. Invite code guessing or replay after revoke or expiry.
7. IDOR: reading another user's reviews, memories, photos or companions by id.
8. A group member who is not a friend of the owner (must be rejected).
9. Memory photos visible through the review-photo path (must not).
10. Direct inserts into friendships, follows, places (must be rejected).
