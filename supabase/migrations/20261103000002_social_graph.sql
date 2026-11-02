-- P1-02..P1-05 Social graph RPCs: friends, invites, follows, block, report (API_SPEC.md §1).
-- Relationship rows are written ONLY here (clients have no write grants on these tables).
set search_path = public, extensions;

-- ---------------------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------------------

-- Start of today in IST, as timestamptz (rate limits are per product day).
create or replace function private.ist_day_start() returns timestamptz
language sql stable set search_path = public, extensions as $$
  select (date_trunc('day', now() at time zone 'Asia/Kolkata')) at time zone 'Asia/Kolkata';
$$;

-- Common guard for every write RPC: signed in and not banned. Returns the caller id.
create or replace function private.require_active_user() returns uuid
language plpgsql stable security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  if not private.is_active_user(uid) then raise exception 'forbidden' using errcode = 'P0001'; end if;
  return uid;
end $$;

create or replace function private.require_target(p_target uuid, p_self uuid) returns void
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if p_target is null or p_target = p_self then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.profiles where id = p_target) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if private.is_blocked_between(p_self, p_target) then raise exception 'blocked' using errcode = 'P0001'; end if;
end $$;

-- Remove group memberships that only existed because two people were friends
-- (group members must be friends of the owner).
create or replace function private.drop_dependent_memberships(a uuid, b uuid) returns void
language sql security definer set search_path = public, extensions as $$
  delete from public.group_members m
   using public.groups g
   where g.id = m.group_id
     and ((g.owner_id = a and m.user_id = b) or (g.owner_id = b and m.user_id = a));
$$;

-- Follow status depends on the followed account's privacy (DATABASE.md §4). Set inside
-- follow_user (the only client path that writes follows) rather than a trigger, so seeds and
-- admin tooling can still write an explicit status. See DECISIONS.md.

-- ---------------------------------------------------------------------------------------
-- Friends (P1-02)
-- ---------------------------------------------------------------------------------------

-- Returns 'requested' or 'accepted' (when the other person had already asked).
create or replace function public.request_friend(p_target uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := private.require_active_user();
  lo uuid; hi uuid; f public.friendships%rowtype;
begin
  perform private.require_target(p_target, uid);
  lo := least(uid, p_target); hi := greatest(uid, p_target);

  select * into f from public.friendships where user_low = lo and user_high = hi for update;
  if found then
    if f.status = 'accepted' then raise exception 'already_friends' using errcode = 'P0001'; end if;
    if f.requested_by = uid then raise exception 'request_pending' using errcode = 'P0001'; end if;
    update public.friendships set status = 'accepted', accepted_at = now() where user_low = lo and user_high = hi;
    return 'accepted';
  end if;

  if (select count(*) from public.friendships
       where requested_by = uid and created_at >= private.ist_day_start()) >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.friendships (user_low, user_high, requested_by) values (lo, hi, uid);
  return 'requested';
end $$;

create or replace function public.respond_friend(p_other uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user(); lo uuid; hi uuid;
begin
  lo := least(uid, p_other); hi := greatest(uid, p_other);
  if not exists (select 1 from public.friendships
                  where user_low = lo and user_high = hi and status = 'pending' and requested_by = p_other) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if p_accept then
    if private.is_blocked_between(uid, p_other) then raise exception 'blocked' using errcode = 'P0001'; end if;
    update public.friendships set status = 'accepted', accepted_at = now() where user_low = lo and user_high = hi;
  else
    delete from public.friendships where user_low = lo and user_high = hi;
  end if;
end $$;

create or replace function public.cancel_friend_request(p_other uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  delete from public.friendships
   where user_low = least(uid, p_other) and user_high = greatest(uid, p_other)
     and status = 'pending' and requested_by = uid;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
end $$;

create or replace function public.remove_friend(p_other uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  delete from public.friendships
   where user_low = least(uid, p_other) and user_high = greatest(uid, p_other) and status = 'accepted';
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  perform private.drop_dependent_memberships(uid, p_other);
end $$;

-- ---------------------------------------------------------------------------------------
-- Invites (P1-03). Friend invites only in Phase 1; group invites arrive in Phase 3.
-- ---------------------------------------------------------------------------------------

create or replace function private.new_invite_code() returns text
language sql volatile set search_path = public, extensions as $$
  -- 18 random bytes -> 24 url-safe base64 chars
  select translate(encode(gen_random_bytes(18), 'base64'), '+/=', '-_');
$$;

create or replace function public.create_invite(p_kind invite_kind default 'friend', p_group uuid default null)
returns table (id uuid, code text, expires_at timestamptz, max_uses int)
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  if p_kind <> 'friend' or p_group is not null then
    raise exception 'invalid_input' using errcode = 'P0001', detail = 'group invites arrive in Phase 3';
  end if;
  if (select count(*) from public.invites i
       where i.created_by = uid and i.created_at >= private.ist_day_start()) >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return query
    insert into public.invites (code, kind, created_by)
    values (private.new_invite_code(), 'friend', uid)
    returning invites.id, invites.code, invites.expires_at, invites.max_uses;
end $$;

create or replace function public.revoke_invite(p_invite uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  update public.invites set revoked_at = coalesce(revoked_at, now())
   where id = p_invite and created_by = uid;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
end $$;

-- Who invited me and is the link still good? Used by the confirm screen before redeeming.
create or replace function public.get_invite_preview(p_code text)
returns table (status text, inviter_id uuid, username text, display_name text, avatar_url text)
language plpgsql stable security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); i public.invites%rowtype;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  select * into i from public.invites where code = p_code;
  if not found then return query select 'not_found'::text, null::uuid, null::text, null::text, null::text; return; end if;

  return query
  select case
           when i.revoked_at is not null then 'invite_revoked'
           when i.expires_at <= now() then 'invite_expired'
           when i.uses >= i.max_uses then 'invite_used_up'
           when i.created_by = uid then 'own_invite'
           when private.is_blocked_between(uid, i.created_by) then 'blocked'
           when private.are_friends(uid, i.created_by) then 'already_friends'
           else 'ok' end,
         p.id, p.username::text, p.display_name, p.avatar_url
    from public.profiles p where p.id = i.created_by;
end $$;

-- Redeeming a friend invite creates the friendship immediately: the inviter pre-consented
-- by creating the link, the redeemer consents by tapping "Add as friend".
create or replace function public.redeem_invite(p_code text)
returns table (kind invite_kind, inviter uuid)
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
    raise exception 'already_friends' using errcode = 'P0001';
  end if;

  lo := least(uid, i.created_by); hi := greatest(uid, i.created_by);
  insert into public.friendships (user_low, user_high, requested_by, status, accepted_at)
  values (lo, hi, i.created_by, 'accepted', now())
  on conflict (user_low, user_high) do update
     set status = 'accepted', accepted_at = coalesce(public.friendships.accepted_at, now());

  insert into public.invite_redemptions (invite_id, user_id) values (i.id, uid);
  update public.invites set uses = uses + 1 where id = i.id;

  return query select i.kind, i.created_by;
end $$;

-- ---------------------------------------------------------------------------------------
-- Follows (P1-04)
-- ---------------------------------------------------------------------------------------

-- Returns 'accepted' or 'pending' (private account).
create or replace function public.follow_user(p_target uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user(); s request_status;
begin
  perform private.require_target(p_target, uid);
  select status into s from public.follows where follower_id = uid and following_id = p_target;
  if found then return s::text; end if;
  if (select count(*) from public.follows
       where follower_id = uid and created_at >= private.ist_day_start()) >= 100 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.follows (follower_id, following_id, status)
  values (uid, p_target,
          case when (select is_private from public.profiles where id = p_target)
               then 'pending'::request_status else 'accepted'::request_status end)
  returning status into s;
  return s::text;
end $$;

create or replace function public.unfollow_user(p_target uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  delete from public.follows where follower_id = uid and following_id = p_target;
end $$;

create or replace function public.respond_follow(p_follower uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  if not exists (select 1 from public.follows
                  where follower_id = p_follower and following_id = uid and status = 'pending') then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if p_accept then
    update public.follows set status = 'accepted' where follower_id = p_follower and following_id = uid;
  else
    delete from public.follows where follower_id = p_follower and following_id = uid;
  end if;
end $$;

create or replace function public.remove_follower(p_follower uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  delete from public.follows where follower_id = p_follower and following_id = uid;
end $$;

-- When an account goes public, pending follow requests become accepted (nothing left to approve).
create or replace function private.accept_pending_when_public() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if old.is_private and not new.is_private then
    update public.follows set status = 'accepted' where following_id = new.id and status = 'pending';
  end if;
  return new;
end $$;

create trigger profiles_accept_pending_when_public after update of is_private on public.profiles
  for each row execute function private.accept_pending_when_public();

-- ---------------------------------------------------------------------------------------
-- Block, mute, report (P1-05)
-- ---------------------------------------------------------------------------------------

create or replace function public.block_user(p_target uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  if p_target is null or p_target = uid then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.profiles where id = p_target) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  delete from public.friendships where user_low = least(uid, p_target) and user_high = greatest(uid, p_target);
  delete from public.follows
   where (follower_id = uid and following_id = p_target) or (follower_id = p_target and following_id = uid);
  delete from public.mutes
   where (muter_id = uid and muted_id = p_target) or (muter_id = p_target and muted_id = uid);
  perform private.drop_dependent_memberships(uid, p_target);
  delete from public.visit_companions c using public.visits v
   where v.id = c.visit_id
     and ((v.user_id = uid and c.user_id = p_target) or (v.user_id = p_target and c.user_id = uid));
  insert into public.blocks (blocker_id, blocked_id) values (uid, p_target) on conflict do nothing;
end $$;

create or replace function public.unblock_user(p_target uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  delete from public.blocks where blocker_id = uid and blocked_id = p_target;
end $$;

create or replace function public.report_content(p_type report_target, p_id uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user(); rid uuid;
begin
  p_reason := btrim(coalesce(p_reason, ''));
  if char_length(p_reason) not between 1 and 500 or p_id is null then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if (select count(*) from public.reports
       where reporter_id = uid and created_at >= private.ist_day_start()) >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.reports (reporter_id, target_type, target_id, reason)
  values (uid, p_type, p_id, p_reason) returning id into rid;
  return rid;
end $$;

-- Reports now go through the rate-limited RPC only.
revoke insert on public.reports from authenticated;

-- Admin: resolve a report (P1-05 /admin/reports). Audited.
create or replace function public.admin_resolve_report(p_report uuid, p_status report_status, p_note text default null)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  if not private.is_admin() then raise exception 'forbidden' using errcode = 'P0001'; end if;
  update public.reports set status = p_status, reviewed_by = uid where id = p_report;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  insert into public.admin_audit (admin_id, action, target, details)
  values (uid, 'resolve_report', p_report::text,
          jsonb_build_object('status', p_status, 'note', left(coalesce(p_note, ''), 500)));
end $$;

-- ---------------------------------------------------------------------------------------
-- Privileges: helpers private, RPCs callable by signed-in users only.
-- ---------------------------------------------------------------------------------------
revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;

grant execute on function
  public.request_friend(uuid), public.respond_friend(uuid, boolean), public.cancel_friend_request(uuid),
  public.remove_friend(uuid), public.create_invite(invite_kind, uuid), public.revoke_invite(uuid),
  public.get_invite_preview(text), public.redeem_invite(text), public.follow_user(uuid),
  public.unfollow_user(uuid), public.respond_follow(uuid, boolean), public.remove_follower(uuid),
  public.block_user(uuid), public.unblock_user(uuid), public.report_content(report_target, uuid, text),
  public.admin_resolve_report(uuid, report_status, text)
to authenticated;
