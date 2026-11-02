-- 0008 security helper functions (SECURITY_PRIVACY.md §2)
--
-- These live in schema `private`, which is NOT exposed through the Supabase Data API.
-- They take arbitrary user ids, so exposing them as RPCs would let any signed-in user
-- probe other people's friendships and blocks. RLS policies and our own RPCs can still
-- call them because `authenticated` has USAGE on the schema. See docs/DECISIONS.md.
set search_path = public, extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from public.friendships f
    where f.user_low = least(a,b) and f.user_high = greatest(a,b) and f.status = 'accepted');
$$;

create or replace function private.is_following(viewer uuid, author uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from public.follows f
    where f.follower_id = viewer and f.following_id = author and f.status = 'accepted');
$$;

create or replace function private.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- True when the user exists and is not banned. Used by insert policies and write RPCs.
create or replace function private.is_active_user(u uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.profiles where id = u and banned_at is null);
$$;

-- Avoids the infinite-recursion trap of a group_members policy that queries group_members.
create or replace function private.is_group_member(g uuid, u uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.group_members m where m.group_id = g and m.user_id = u);
$$;

-- 0 self, 1 friend, 2 following, 3 everyone, null when blocked or anonymous
create or replace function private.relationship_tier(viewer uuid, author uuid) returns smallint
language sql stable security definer set search_path = public, extensions as $$
  select case
    when viewer is null then null
    when viewer = author then 0
    when private.is_blocked_between(viewer, author) then null
    when private.are_friends(viewer, author) then 1
    when private.is_following(viewer, author) then 2
    else 3 end::smallint;
$$;

create or replace function private.can_view_visit(viewer uuid, v_id uuid, v_author uuid, v_vis visibility)
returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select case
    when viewer is null then false
    when viewer = v_author then true
    when private.is_blocked_between(viewer, v_author) then false
    when v_vis = 'private' then false
    when v_vis = 'friends' then
      private.are_friends(viewer, v_author)
      and (
        not exists (select 1 from public.visit_audience_groups g where g.visit_id = v_id)
        or exists (select 1 from public.visit_audience_groups g
                   join public.group_members m on m.group_id = g.group_id
                   where g.visit_id = v_id and m.user_id = viewer)
      )
    when v_vis = 'followers' then
      private.are_friends(viewer, v_author) or private.is_following(viewer, v_author)
    when v_vis = 'public' then
      case when (select p.is_private from public.profiles p where p.id = v_author)
           then private.are_friends(viewer, v_author) or private.is_following(viewer, v_author)
           else true end
    else false
  end;
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;
