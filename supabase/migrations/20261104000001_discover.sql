-- Phase 2: Discover people (P2-01..P2-05). API_SPEC.md "Discover (Phase 2)".
set search_path = public, extensions;

-- ---------------------------------------------------------------------------------------
-- Taste match (P2-03)
-- Agreement on places both people visited, using each person's latest non-private visit
-- per place, and only where each visit is visible to the other person. Shown only when
-- shared_places >= 5 (enforced in every reader below, and in the UI).
-- Agreement: same verdict (go = go, skip = skip, only_for = only_for).
-- ---------------------------------------------------------------------------------------
create or replace function private.compute_taste_matches(p_user uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from public.taste_matches where p_user in (user_a, user_b);

  insert into public.taste_matches (user_a, user_b, shared_places, agreed, rate, updated_at)
  with mine as (
    select distinct on (v.place_id) v.id, v.place_id, v.verdict, v.visibility
    from public.visits v
    where v.user_id = p_user and v.visibility <> 'private'
    order by v.place_id, v.visited_on desc, v.logged_at desc, v.id desc
  ), theirs as (
    select distinct on (v.user_id, v.place_id) v.id, v.user_id, v.place_id, v.verdict, v.visibility
    from public.visits v
    join mine m on m.place_id = v.place_id
    where v.user_id <> p_user and v.visibility <> 'private'
    order by v.user_id, v.place_id, v.visited_on desc, v.logged_at desc, v.id desc
  ), pairs as (
    select t.user_id as other,
           count(*)::int as shared,
           count(*) filter (where t.verdict = m.verdict)::int as agreed
    from theirs t
    join mine m on m.place_id = t.place_id
    where private.can_view_visit(t.user_id, m.id, p_user, m.visibility)
      and private.can_view_visit(p_user, t.id, t.user_id, t.visibility)
    group by t.user_id
  )
  select least(p_user, other), greatest(p_user, other), shared, agreed,
         round(agreed * 100.0 / shared, 2), now()
  from pairs;
end $$;

-- RPC: refresh the caller's own matches (lazy refresh on Discover / profile view).
create or replace function public.refresh_my_taste_matches() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  perform private.compute_taste_matches(uid);
end $$;

-- Nightly: everyone with visits (secret key / cron only).
create or replace function public.refresh_all_taste_matches() returns int
language plpgsql security definer set search_path = public, extensions as $$
declare u uuid; n int := 0;
begin
  for u in select distinct user_id from public.visits loop
    perform private.compute_taste_matches(u);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Taste match between the viewer and one person, null below the 5-place threshold.
create or replace function private.match_with(viewer uuid, other uuid)
returns table (shared_places int, match_rate numeric)
language sql stable security definer set search_path = public, extensions as $$
  select m.shared_places, case when m.shared_places >= 5 then m.rate end
  from public.taste_matches m
  where m.user_a = least(viewer, other) and m.user_b = greatest(viewer, other);
$$;

-- How many of `author`'s visits the viewer may see, optionally filtered to some places.
create or replace function private.visible_visit_count(viewer uuid, author uuid) returns int
language sql stable security definer set search_path = public, extensions as $$
  select count(*)::int from public.visits v
  where v.user_id = author and private.can_view_visit(viewer, v.id, v.user_id, v.visibility);
$$;

-- ---------------------------------------------------------------------------------------
-- Discover people (P2-01, P2-02, P2-04 friends-of-friends, P2-06 suggestions)
-- p_kind: 'search' | 'taste' | 'area' | 'cuisine' | 'diet' | 'friends_of_friends' | 'suggested'
-- Excludes: yourself, accepted friends, blocked either way, banned and un-onboarded profiles.
-- Private accounts appear with their basic profile only; their visits are not visible to
-- strangers, so they never rank on visit-derived lists.
-- ---------------------------------------------------------------------------------------
create or replace function public.get_discover_people(p_kind text, p_param text default null, p_limit int default 20)
returns table (user_id uuid, username text, display_name text, avatar_url text, is_private boolean,
               home_area text, follow_state text, score int, shared_places int, match_rate numeric)
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  lim int := least(greatest(coalesce(p_limit, 20), 1), 50);
  q text;
  v_area uuid;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  if p_kind not in ('search','taste','area','cuisine','diet','friends_of_friends','suggested') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  if p_kind = 'area' then
    select a.id into v_area from public.areas a where a.slug = p_param;
    if v_area is null then return; end if;
  end if;
  q := lower(btrim(coalesce(p_param, '')));

  return query
  with candidates as (
    select p.id, p.username::text as username, p.display_name, p.avatar_url, p.is_private,
           a.name as home_area, p.diet_prefs
    from public.profiles p
    left join public.areas a on a.id = p.home_area_id
    where p.id <> uid
      and p.onboarded_at is not null
      and p.banned_at is null
      and not private.is_blocked_between(uid, p.id)
      and not private.are_friends(uid, p.id)
  ), scored as (
    select c.*,
      case p_kind
        when 'search' then 0
        when 'taste' then 0
        when 'friends_of_friends' then (
          select count(*)::int from public.friendships f1
          join public.friendships f2
            on f2.status = 'accepted'
           and c.id in (f2.user_low, f2.user_high)
           and (case when f1.user_low = uid then f1.user_high else f1.user_low end) in (f2.user_low, f2.user_high)
          where f1.status = 'accepted' and uid in (f1.user_low, f1.user_high))
        when 'area' then (
          select count(*)::int from public.visits v
          join public.places pl on pl.id = v.place_id
          left join public.areas pa on pa.id = pl.area_id
          where v.user_id = c.id
            and (pl.area_id = v_area or pa.parent_id = v_area)
            and private.can_view_visit(uid, v.id, v.user_id, v.visibility))
        when 'cuisine' then (
          select count(*)::int from public.visits v
          join public.places pl on pl.id = v.place_id
          where v.user_id = c.id and pl.cuisine_tags @> array[q]
            and private.can_view_visit(uid, v.id, v.user_id, v.visibility))
        else private.visible_visit_count(uid, c.id)   -- diet, suggested
      end as score
    from candidates c
    where case p_kind
      when 'search' then length(q) >= 2
        and (c.username ilike replace(replace(q, '%', '\%'), '_', '\_') || '%'
             or c.display_name ilike '%' || replace(replace(q, '%', '\%'), '_', '\_') || '%')
      when 'diet' then c.diet_prefs @> array[q]
      else true
    end
  )
  select s.id, s.username, s.display_name, s.avatar_url, s.is_private, s.home_area,
         coalesce((select f.status::text from public.follows f
                    where f.follower_id = uid and f.following_id = s.id), 'none'),
         s.score,
         m.shared_places,
         m.match_rate
  from scored s
  left join lateral private.match_with(uid, s.id) m on true
  where case p_kind
          when 'search' then true
          when 'taste' then m.match_rate is not null
          else s.score > 0
        end
  order by
    case when p_kind = 'taste' then m.match_rate end desc nulls last,
    case when p_kind = 'taste' then m.shared_places end desc nulls last,
    s.score desc,
    s.username
  limit lim;
end $$;

-- ---------------------------------------------------------------------------------------
-- After logging (P2-04): people who logged this place whom you could follow.
-- ---------------------------------------------------------------------------------------
create or replace function public.suggest_people_after_log(p_place uuid, p_limit int default 5)
returns table (user_id uuid, username text, display_name text, avatar_url text, is_private boolean,
               verdict verdict, others_count int)
language sql stable security definer set search_path = public, extensions as $$
  with eligible as (
    select t.author_id, t.verdict, t.logged_at
    from private.latest_visible_verdicts(p_place, auth.uid()) t
    where t.tier = 3                                   -- not you, not friends, not followed
      and not exists (select 1 from public.follows f
                       where f.follower_id = auth.uid() and f.following_id = t.author_id) -- not requested
  )
  select p.id, p.username::text, p.display_name, p.avatar_url, p.is_private, e.verdict,
         (select count(*)::int from eligible)
  from eligible e
  join public.profiles p on p.id = e.author_id
  where auth.uid() is not null and p.banned_at is null
  order by e.logged_at desc
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
$$;

-- ---------------------------------------------------------------------------------------
-- Profile stats (P2-05): add areas covered and the viewer's taste match.
-- ---------------------------------------------------------------------------------------
drop function if exists public.get_profile_stats(uuid);
create function public.get_profile_stats(p_user uuid)
returns table (friends int, followers int, following int, visits_visible int, places_visible int,
               areas_visible int, shared_places int, match_rate numeric)
language plpgsql stable security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  if private.is_blocked_between(uid, p_user) then return; end if;
  return query
  with vis as (
    select v.place_id, pl.area_id from public.visits v
    join public.places pl on pl.id = v.place_id
    where v.user_id = p_user and private.can_view_visit(uid, v.id, v.user_id, v.visibility)
  )
  select
    (select count(*)::int from public.friendships f
      where p_user in (f.user_low, f.user_high) and f.status = 'accepted'),
    (select count(*)::int from public.follows f where f.following_id = p_user and f.status = 'accepted'),
    (select count(*)::int from public.follows f where f.follower_id = p_user and f.status = 'accepted'),
    (select count(*)::int from vis),
    (select count(distinct place_id)::int from vis),
    (select count(distinct area_id)::int from vis),
    m.shared_places,
    m.match_rate
  from (select 1) one
  left join lateral private.match_with(uid, p_user) m on uid <> p_user;
end $$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
revoke execute on function public.refresh_all_taste_matches() from public, anon, authenticated;
grant execute on function public.refresh_all_taste_matches() to service_role;
grant execute on function public.refresh_my_taste_matches(), public.get_discover_people(text, text, int),
  public.suggest_people_after_log(uuid, int), public.get_profile_stats(uuid) to authenticated;
