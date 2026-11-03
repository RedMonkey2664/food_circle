-- Phase 3: optional groups (PHASES.md P3-01..P3-06, DATABASE.md §6, API_SPEC.md Groups).
-- Groups are named buckets of the owner's friends. A Friends visit can be shared with specific
-- groups only; can_view_visit (0008) already enforces audience groups in RLS.
set search_path = public, extensions;

-- ---------------------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------------------

-- Members must be accepted friends of the owner (the owner is a member too). Stops groups
-- becoming a backdoor for strangers (SECURITY_PRIVACY.md test 8).
create or replace function private.group_member_must_be_friend() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare owner uuid;
begin
  select owner_id into owner from public.groups where id = new.group_id;
  if new.user_id <> owner and not private.are_friends(owner, new.user_id) then
    raise exception 'needs_friendship' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger group_member_must_be_friend before insert on public.group_members
  for each row execute function private.group_member_must_be_friend();

-- Audience groups only on Friends visits, and only groups the author belongs to.
create or replace function private.audience_groups_only_for_friends() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare v public.visits%rowtype;
begin
  select * into v from public.visits where id = new.visit_id;
  if v.visibility <> 'friends' then
    raise exception 'invalid_input' using errcode = 'P0001', detail = 'audience groups need Friends visibility';
  end if;
  if not private.is_group_member(new.group_id, v.user_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger audience_groups_only_for_friends before insert on public.visit_audience_groups
  for each row execute function private.audience_groups_only_for_friends();

-- Moving a visit away from Friends drops its audience groups (they only mean something there).
create or replace function private.visits_clear_audience() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.visibility <> 'friends' then
    delete from public.visit_audience_groups where visit_id = new.id;
  end if;
  return new;
end $$;

create trigger visits_clear_audience after update of visibility on public.visits
  for each row when (old.visibility is distinct from new.visibility)
  execute function private.visits_clear_audience();

-- Deleting a group must never widen who can see a visit: a visit shared only with this group
-- would otherwise fall back to "all friends". Make those visits private instead.
create or replace function private.groups_before_delete() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  update public.visits v set visibility = 'private'
   where v.id in (select a.visit_id from public.visit_audience_groups a where a.group_id = old.id)
     and not exists (select 1 from public.visit_audience_groups b
                      where b.visit_id = v.id and b.group_id <> old.id);
  return old;
end $$;

create trigger groups_before_delete before delete on public.groups
  for each row execute function private.groups_before_delete();

-- ---------------------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------------------

-- The group label for a verdict card (P3-03): the visit's own audience group if the viewer is
-- in it, otherwise a group the viewer and author share. Null when there is none.
create or replace function private.shared_group_name(p_viewer uuid, p_author uuid, p_visit uuid)
returns text
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(
    (select g.name from public.visit_audience_groups a
       join public.groups g on g.id = a.group_id
      where a.visit_id = p_visit and private.is_group_member(g.id, p_viewer)
      order by g.created_at limit 1),
    (select g.name from public.groups g
      where p_viewer <> p_author
        and private.is_group_member(g.id, p_viewer) and private.is_group_member(g.id, p_author)
      order by g.created_at limit 1));
$$;

-- ---------------------------------------------------------------------------------------
-- Group RPCs (P3-01, P3-02, P3-06)
-- ---------------------------------------------------------------------------------------

create or replace function public.create_group(p_name text, p_kind text default 'custom')
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user(); gid uuid; n text := btrim(coalesce(p_name, ''));
begin
  if char_length(n) not between 1 and 40 or p_kind not in ('family','friends','custom') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if (select count(*) from public.groups where owner_id = uid) >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  -- P3-06: every group starts private with no leaderboard (owner opt-in arrives in Phase 6).
  insert into public.groups (name, kind, owner_id, is_private, leaderboard_enabled)
  values (n, p_kind, uid, true, false)
  returning id into gid;
  insert into public.group_members (group_id, user_id, role) values (gid, uid, 'owner');
  return gid;
end $$;

create or replace function private.require_group_owner(p_group uuid, p_uid uuid) returns void
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.groups where id = p_group and owner_id = p_uid) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
end $$;

create or replace function private.add_member(p_group uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if exists (select 1 from public.group_members where group_id = p_group and user_id = p_user) then
    return;
  end if;
  if (select count(*) from public.group_members where group_id = p_group) >= 50 then
    raise exception 'group_full' using errcode = 'P0001';
  end if;
  insert into public.group_members (group_id, user_id, role) values (p_group, p_user, 'member');
end $$;

create or replace function public.add_group_member(p_group uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  perform private.require_group_owner(p_group, uid);
  if not private.are_friends(uid, p_user) then
    raise exception 'needs_friendship' using errcode = 'P0001';
  end if;
  perform private.add_member(p_group, p_user);
end $$;

-- The owner removes someone, or a member removes themself (leave). The owner can't leave;
-- they delete the group instead.
create or replace function public.remove_group_member(p_group uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user(); owner uuid;
begin
  select owner_id into owner from public.groups where id = p_group;
  if owner is null or (uid <> owner and uid <> p_user) or not private.is_group_member(p_group, uid) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if p_user = owner then
    raise exception 'invalid_input' using errcode = 'P0001', detail = 'owner deletes the group instead';
  end if;
  delete from public.group_members where group_id = p_group and user_id = p_user;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
end $$;

create or replace function public.delete_group(p_group uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  perform private.require_group_owner(p_group, uid);
  delete from public.groups where id = p_group;
end $$;

create or replace function public.rename_group(p_group uuid, p_name text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user(); n text := btrim(coalesce(p_name, ''));
begin
  perform private.require_group_owner(p_group, uid);
  if char_length(n) not between 1 and 40 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  update public.groups set name = n where id = p_group;
end $$;

-- My groups, for the groups list, home feed tabs and the log sheet's audience picker.
create or replace function public.get_my_groups()
returns table (id uuid, name text, kind text, role group_role, member_count int, created_at timestamptz)
language sql stable security definer set search_path = public, extensions as $$
  select g.id, g.name, g.kind, m.role,
         (select count(*)::int from public.group_members x where x.group_id = g.id),
         g.created_at
  from public.group_members m
  join public.groups g on g.id = m.group_id
  where m.user_id = auth.uid()
  order by g.created_at;
$$;

-- Members of one of my groups (blocked people hidden from me).
create or replace function public.get_group_members(p_group uuid)
returns table (user_id uuid, username text, display_name text, avatar_url text, role group_role,
               joined_at timestamptz)
language sql stable security definer set search_path = public, extensions as $$
  select p.id, p.username::text, p.display_name, p.avatar_url, m.role, m.joined_at
  from public.group_members m
  join public.profiles p on p.id = m.user_id
  where m.group_id = p_group
    and private.is_group_member(p_group, auth.uid())
    and not private.is_blocked_between(auth.uid(), m.user_id)
  order by m.role, p.display_name;
$$;

-- Share a Friends visit with specific groups only. Empty array = all friends again.
create or replace function public.set_visit_audience_groups(p_visit uuid, p_groups uuid[])
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  if not exists (select 1 from public.visits where id = p_visit and user_id = uid) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if cardinality(coalesce(p_groups, '{}')) > 10 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  delete from public.visit_audience_groups
   where visit_id = p_visit and not (group_id = any (coalesce(p_groups, '{}')));
  insert into public.visit_audience_groups (visit_id, group_id)
  select p_visit, g from unnest(coalesce(p_groups, '{}')) g
  on conflict do nothing;
end $$;

-- Log a visit shared with specific groups in ONE transaction, so it is never visible to all
-- friends in between. Security invoker: the visit insert goes through the normal RLS policy
-- and column grants; the audience rows go through set_visit_audience_groups.
create or replace function public.log_visit_for_groups(
  p_place uuid, p_verdict verdict, p_groups uuid[],
  p_only_for_text text default null, p_visited_on date default null)
returns uuid
language plpgsql security invoker set search_path = public, extensions as $$
declare vid uuid;
begin
  if cardinality(coalesce(p_groups, '{}')) = 0 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  insert into public.visits (user_id, place_id, verdict, only_for_text, visibility, visited_on)
  values (auth.uid(), p_place, p_verdict, case when p_verdict = 'only_for' then p_only_for_text end,
          'friends', coalesce(p_visited_on, (now() at time zone 'Asia/Kolkata')::date))
  returning id into vid;
  perform public.set_visit_audience_groups(vid, p_groups);
  return vid;
end $$;

-- ---------------------------------------------------------------------------------------
-- Group invites (P3-01). Owner creates; redeemer must be the owner's friend, or become one
-- through the same link (the owner pre-consented by sharing it, as with friend invites).
-- ---------------------------------------------------------------------------------------

create or replace function public.create_invite(p_kind invite_kind default 'friend', p_group uuid default null)
returns table (id uuid, code text, expires_at timestamptz, max_uses int)
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  if (p_kind = 'friend') <> (p_group is null) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_kind = 'group' then perform private.require_group_owner(p_group, uid); end if;
  if (select count(*) from public.invites i
       where i.created_by = uid and i.created_at >= private.ist_day_start()) >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return query
    insert into public.invites (code, kind, created_by, group_id)
    values (private.new_invite_code(), p_kind, uid, p_group)
    returning invites.id, invites.code, invites.expires_at, invites.max_uses;
end $$;

drop function public.get_invite_preview(text);
create function public.get_invite_preview(p_code text)
returns table (status text, inviter_id uuid, username text, display_name text, avatar_url text,
               kind invite_kind, group_id uuid, group_name text)
language plpgsql stable security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); i public.invites%rowtype; gname text;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  select * into i from public.invites where code = p_code;
  if not found then
    return query select 'not_found'::text, null::uuid, null::text, null::text, null::text,
                        null::invite_kind, null::uuid, null::text;
    return;
  end if;
  select g.name into gname from public.groups g where g.id = i.group_id;

  return query
  select case
           when i.revoked_at is not null then 'invite_revoked'
           when i.expires_at <= now() then 'invite_expired'
           when i.uses >= i.max_uses then 'invite_used_up'
           when i.kind = 'group' and private.is_group_member(i.group_id, uid) then 'already_member'
           when i.created_by = uid then 'own_invite'
           when private.is_blocked_between(uid, i.created_by) then 'blocked'
           when i.kind = 'friend' and private.are_friends(uid, i.created_by) then 'already_friends'
           when i.kind = 'group' and not private.are_friends(uid, i.created_by) then 'needs_friendship'
           else 'ok' end,
         p.id, p.username::text, p.display_name, p.avatar_url, i.kind, i.group_id, gname
    from public.profiles p where p.id = i.created_by;
end $$;

drop function public.redeem_invite(text);
create function public.redeem_invite(p_code text, p_befriend boolean default false)
returns table (kind invite_kind, inviter uuid, group_id uuid)
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user(); i public.invites%rowtype; lo uuid; hi uuid;
begin
  if (select count(*) from public.invite_redemptions r
       where r.user_id = uid and r.redeemed_at >= private.ist_day_start()) >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  select * into i from public.invites where code = p_code for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if i.revoked_at is not null then raise exception 'invite_revoked' using errcode = 'P0001'; end if;
  if i.expires_at <= now() then raise exception 'invite_expired' using errcode = 'P0001'; end if;
  if i.uses >= i.max_uses then raise exception 'invite_used_up' using errcode = 'P0001'; end if;
  if i.created_by = uid then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if private.is_blocked_between(uid, i.created_by) then raise exception 'blocked' using errcode = 'P0001'; end if;
  if exists (select 1 from public.invite_redemptions r where r.invite_id = i.id and r.user_id = uid) then
    if i.kind = 'group' then raise exception 'already_member' using errcode = 'P0001'; end if;
    raise exception 'already_friends' using errcode = 'P0001';
  end if;

  lo := least(uid, i.created_by); hi := greatest(uid, i.created_by);
  if i.kind = 'friend' or (p_befriend and not private.are_friends(uid, i.created_by)) then
    insert into public.friendships (user_low, user_high, requested_by, status, accepted_at)
    values (lo, hi, i.created_by, 'accepted', now())
    on conflict (user_low, user_high) do update
       set status = 'accepted', accepted_at = coalesce(public.friendships.accepted_at, now());
  end if;

  if i.kind = 'group' then
    if not private.are_friends(uid, i.created_by) then
      raise exception 'needs_friendship' using errcode = 'P0001';
    end if;
    perform private.add_member(i.group_id, uid);
  end if;

  insert into public.invite_redemptions (invite_id, user_id) values (i.id, uid);
  update public.invites set uses = uses + 1 where id = i.id;

  return query select i.kind, i.created_by, i.group_id;
end $$;

-- ---------------------------------------------------------------------------------------
-- Group tag on verdicts (P3-03) and the group feed tab (P3-05)
-- ---------------------------------------------------------------------------------------

create or replace function public.get_place_verdicts(
  p_place uuid, p_tier_filter text default 'friends_following', p_limit int default 100)
returns table (visit_id uuid, author_id uuid, username text, display_name text, avatar_url text,
               tier smallint, group_name text, verdict verdict, only_for_text text,
               visited_on date, logged_at timestamptz)
language sql stable security definer set search_path = public, extensions as $$
  select t.visit_id, t.author_id, p.username::text, p.display_name, p.avatar_url, t.tier,
         private.shared_group_name(auth.uid(), t.author_id, t.visit_id),
         t.verdict, t.only_for_text, t.visited_on, t.logged_at
  from private.latest_visible_verdicts(p_place, auth.uid()) t
  join public.profiles p on p.id = t.author_id
  left join public.taste_matches m
    on t.tier = 2
   and m.user_a = least(auth.uid(), t.author_id) and m.user_b = greatest(auth.uid(), t.author_id)
   and m.shared_places >= 5
  where auth.uid() is not null
    and t.tier <= case p_tier_filter when 'friends' then 1 when 'friends_following' then 2 else 3 end
  order by t.tier, case when t.tier = 2 then m.rate end desc nulls last, t.visited_on desc, t.logged_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

-- Tabs: 'friends', 'following', or 'group:<uuid>' (members' visits I may see, any tier).
drop function public.get_home_feed(text, int, timestamptz, uuid);
create function public.get_home_feed(
  p_tab text,
  p_limit int default 20,
  p_cursor_ts timestamptz default null,
  p_cursor_id uuid default null)
returns table (visit_id uuid, author_id uuid, username text, display_name text, avatar_url text,
               tier smallint, group_name text, place_id uuid, place_name text, area_name text,
               verdict verdict, only_for_text text, visited_on date, logged_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); gid uuid;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  if p_tab like 'group:%' then
    begin
      gid := substring(p_tab from 7)::uuid;
    exception when others then
      raise exception 'invalid_input' using errcode = 'P0001';
    end;
    if not private.is_group_member(gid, uid) then raise exception 'not_found' using errcode = 'P0001'; end if;
  elsif p_tab not in ('friends', 'following') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  return query
  with friends as (
    select case when f.user_low = uid then f.user_high else f.user_low end as id
    from public.friendships f
    where uid in (f.user_low, f.user_high) and f.status = 'accepted'
  ), authors as (
    select id, 1::smallint as t from friends where p_tab = 'friends'
    union all
    select fo.following_id, 2::smallint from public.follows fo
    where p_tab = 'following' and fo.follower_id = uid and fo.status = 'accepted'
      and fo.following_id not in (select id from friends)
    union all
    select m.user_id, private.relationship_tier(uid, m.user_id) from public.group_members m
    where gid is not null and m.group_id = gid
  )
  select v.id, v.user_id, pr.username::text, pr.display_name, pr.avatar_url, a.t,
         case when gid is not null then (select g.name from public.groups g where g.id = gid)
              else private.shared_group_name(uid, v.user_id, v.id) end,
         pl.id, pl.name, ar.name, v.verdict, v.only_for_text, v.visited_on, v.logged_at
  from authors a
  join public.visits v on v.user_id = a.id
  join public.profiles pr on pr.id = v.user_id
  join public.places pl on pl.id = v.place_id
  left join public.areas ar on ar.id = pl.area_id
  where a.t is not null
    and not exists (select 1 from public.mutes m where m.muter_id = uid and m.muted_id = v.user_id)
    and private.can_view_visit(uid, v.id, v.user_id, v.visibility)
    and (p_cursor_ts is null or (v.logged_at, v.id) < (p_cursor_ts, p_cursor_id))
  order by v.logged_at desc, v.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;

-- ---------------------------------------------------------------------------------------
-- Grants (default privileges revoke execute from public; grant explicitly)
-- ---------------------------------------------------------------------------------------
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
grant execute on function
  public.create_group(text, text), public.add_group_member(uuid, uuid),
  public.remove_group_member(uuid, uuid), public.delete_group(uuid), public.rename_group(uuid, text),
  public.get_my_groups(), public.get_group_members(uuid),
  public.set_visit_audience_groups(uuid, uuid[]),
  public.log_visit_for_groups(uuid, verdict, uuid[], text, date),
  public.create_invite(invite_kind, uuid), public.get_invite_preview(text),
  public.redeem_invite(text, boolean), public.get_home_feed(text, int, timestamptz, uuid)
  to authenticated;
