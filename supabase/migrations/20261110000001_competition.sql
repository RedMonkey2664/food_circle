-- Phase 6: competition and badges (PHASES.md P6-01..P6-07, SCORING_BADGES.md sections 4-8).
-- Scoring itself is unchanged (recompute_visit_flags, refresh_user_scores, refresh_user_streak
-- from Phase 1). This adds the badge engine, leaderboards, levels, post-log feedback and
-- verified visits.
set search_path = public, extensions;

-- ---------------------------------------------------------------------------------------
-- Level (one place for the formula): floor(sqrt(all-time unique places)).
-- ---------------------------------------------------------------------------------------
create or replace function private.level_for(p_places int) returns int
language sql immutable as $$ select floor(sqrt(greatest(coalesce(p_places, 0), 0)))::int $$;

-- ---------------------------------------------------------------------------------------
-- P6-04 badge engine. Rules live in badges.rule (JSON); adding a badge needs no schema change.
-- Uses counted visits (counts_all_time). Inserts on first success, never removes.
-- ---------------------------------------------------------------------------------------
create or replace function private.badge_progress(p_user uuid, p_rule jsonb) returns int
language plpgsql stable security definer set search_path = public, extensions as $$
declare t text := p_rule->>'type'; n int := 0;
begin
  case t
    when 'unique_places_in_areas' then
      select count(distinct v.place_id) into n
      from public.visits v join public.places p on p.id = v.place_id
      join public.areas a on a.id = p.area_id
      left join public.areas parent on parent.id = a.parent_id
      where v.user_id = p_user and v.counts_all_time
        and (a.slug in (select jsonb_array_elements_text(p_rule->'area_slugs'))
             or parent.slug in (select jsonb_array_elements_text(p_rule->'area_slugs')));
    when 'unique_areas' then
      select count(distinct coalesce(case when a.kind = coalesce(p_rule->>'kind', a.kind) then a.id end,
                                     case when parent.kind = p_rule->>'kind' then parent.id end)) into n
      from public.visits v join public.places p on p.id = v.place_id
      join public.areas a on a.id = p.area_id
      left join public.areas parent on parent.id = a.parent_id
      where v.user_id = p_user and v.counts_all_time;
    when 'unique_places_in_region' then
      select count(distinct v.place_id) into n
      from public.visits v join public.places p on p.id = v.place_id
      join public.areas a on a.id = p.area_id
      left join public.areas parent on parent.id = a.parent_id
      left join public.areas grand on grand.id = parent.parent_id
      where v.user_id = p_user and v.counts_all_time
        and p_rule->>'region_slug' in (a.slug, parent.slug, grand.slug);
    when 'unique_places_with_cuisine' then
      select count(distinct v.place_id) into n
      from public.visits v join public.places p on p.id = v.place_id
      where v.user_id = p_user and v.counts_all_time and (p_rule->>'cuisine_tag') = any (p.cuisine_tags);
    when 'unique_places_of_type' then
      select count(distinct v.place_id) into n
      from public.visits v join public.places p on p.id = v.place_id
      where v.user_id = p_user and v.counts_all_time and p.type::text = p_rule->>'place_type';
    when 'first_among_friends' then
      -- Places where my counted visit is the earliest among me and my friends, and at least
      -- one friend logged it later.
      select count(*) into n from (
        select v.place_id
        from public.visits v
        where v.user_id = p_user and v.counts_all_time
          and exists (select 1 from public.visits f
                      where f.place_id = v.place_id and f.user_id <> p_user
                        and private.are_friends(p_user, f.user_id) and f.logged_at > v.logged_at)
          and not exists (select 1 from public.visits f
                          where f.place_id = v.place_id and f.user_id <> p_user
                            and private.are_friends(p_user, f.user_id) and f.logged_at < v.logged_at)
      ) x;
    when 'skip_and_go_balance' then
      select least(
        (count(distinct place_id) filter (where verdict = 'skip')) * 1000 / greatest((p_rule->>'min_skip')::int, 1),
        (count(distinct place_id) filter (where verdict = 'go')) * 1000 / greatest((p_rule->>'min_go')::int, 1))
      into n from public.visits where user_id = p_user;
      return n;  -- scaled: >= 1000 means both minimums met
    when 'streak_weeks' then
      select coalesce(best_streak, 0) into n from public.user_streaks where user_id = p_user;
    else
      return 0;  -- rule types for later phases evaluate to 0 until implemented
  end case;
  return coalesce(n, 0);
end $$;

create or replace function private.evaluate_badges(p_user uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare b record; target int;
begin
  for b in
    select bd.id, bd.rule from public.badges bd
    where bd.is_active
      and not exists (select 1 from public.user_badges ub where ub.user_id = p_user and ub.badge_id = bd.id)
  loop
    target := case when b.rule->>'type' = 'skip_and_go_balance' then 1000
                   else coalesce((b.rule->>'threshold')::int, 1) end;
    if private.badge_progress(p_user, b.rule) >= target then
      insert into public.user_badges (user_id, badge_id) values (p_user, b.id) on conflict do nothing;
    end if;
  end loop;
end $$;

-- First Finder depends on friends' later visits: when someone logs a place, re-check the
-- friends who were there before them.
create or replace function private.trg_visits_badges_for_friends() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare f uuid;
begin
  if current_setting('app.skip_recompute', true) = 'on' then return null; end if;
  for f in
    select distinct v.user_id from public.visits v
    where v.place_id = new.place_id and v.user_id <> new.user_id and v.logged_at < new.logged_at
      and private.are_friends(v.user_id, new.user_id)
  loop
    perform private.evaluate_badges(f);
  end loop;
  return null;
end $$;

create trigger visits_badges_for_friends after insert on public.visits
  for each row execute function private.trg_visits_badges_for_friends();

-- ---------------------------------------------------------------------------------------
-- P6-02 leaderboards (no Mumbai-wide or global scope exists; do not add one)
-- ---------------------------------------------------------------------------------------
create or replace function private.period_start_for(p_period score_period, p_start date) returns date
language sql stable as $$
  select coalesce(p_start, case p_period
    when 'week' then ((now() at time zone 'Asia/Kolkata')::date
                      - (extract(isodow from (now() at time zone 'Asia/Kolkata')::date)::int - 1))
    when 'month' then date_trunc('month', (now() at time zone 'Asia/Kolkata'))::date
    else date '1970-01-01' end);
$$;

create or replace function public.get_leaderboard(
  p_scope text, p_group uuid default null, p_period score_period default 'month',
  p_period_start date default null)
returns table (rank int, user_id uuid, username text, display_name text, avatar_url text,
               score int, verified int, is_me boolean, ahead_by int)
language plpgsql stable security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); pstart date := private.period_start_for(p_period, p_period_start);
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  if p_scope not in ('friends', 'group', 'following') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_scope = 'group' and not exists (
       select 1 from public.groups g where g.id = p_group and g.leaderboard_enabled
         and private.is_group_member(g.id, uid)) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  return query
  with members as (
    select uid as id
    union
    select case when f.user_low = uid then f.user_high else f.user_low end
      from public.friendships f
     where p_scope = 'friends' and uid in (f.user_low, f.user_high) and f.status = 'accepted'
    union
    select fo.following_id from public.follows fo
     where p_scope = 'following' and fo.follower_id = uid and fo.status = 'accepted'
    union
    select m.user_id from public.group_members m where p_scope = 'group' and m.group_id = p_group
  ), scored as (
    select pr.id, pr.username::text as username, pr.display_name, pr.avatar_url,
           coalesce(s.unique_places_shared, 0) as score,
           (select count(*)::int from public.visits v
             where v.user_id = pr.id and v.verified and v.counts_all_time and v.visibility <> 'private'
               and (p_period = 'all' or (v.counts_in_periods and v.visited_on >= pstart
                    and v.visited_on < case p_period when 'week' then pstart + 7
                                                     else (pstart + interval '1 month')::date end))) as verified,
           coalesce(s.updated_at, now()) as updated_at,
           pr.id = uid as is_me
    from members m
    join public.profiles pr on pr.id = m.id
    left join public.user_scores s on s.user_id = pr.id and s.period = p_period and s.period_start = pstart
    where pr.onboarded_at is not null and pr.banned_at is null
      and (pr.id = uid or (pr.leaderboards_opt_in and not private.is_blocked_between(uid, pr.id)))
  ), ranked as (
    select sc.*, (rank() over (order by sc.score desc, sc.verified desc, sc.updated_at))::int as rk,
           lag(sc.score) over (order by sc.score desc, sc.verified desc, sc.updated_at) as above
    from scored sc
  )
  select r.rk, r.id, r.username, r.display_name, r.avatar_url, r.score, r.verified, r.is_me,
         case when r.above is null then null else (r.above - r.score + 1)::int end
  from ranked r
  order by r.rk, r.display_name
  limit 100;
end $$;

-- Group owners switch their group's board on or off (P3-06 said: off until Phase 6).
create or replace function public.set_group_leaderboard(p_group uuid, p_enabled boolean) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  update public.groups set leaderboard_enabled = coalesce(p_enabled, false)
   where id = p_group and owner_id = uid;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- P6-01, P6-05, P6-06: my progress; anyone's level and badges (for profiles and cards)
-- ---------------------------------------------------------------------------------------
create or replace function public.get_my_progress()
returns table (all_time int, this_week int, this_month int, level int,
               current_streak int, best_streak int, last_active_week date, in_grace boolean)
language sql stable security definer set search_path = public, extensions as $$
  with me as (select auth.uid() as id),
  s as (
    select
      coalesce((select unique_places from public.user_scores where user_id = me.id and period = 'all'), 0) as a,
      coalesce((select unique_places from public.user_scores where user_id = me.id and period = 'week'
                 and period_start = private.period_start_for('week', null)), 0) as w,
      coalesce((select unique_places from public.user_scores where user_id = me.id and period = 'month'
                 and period_start = private.period_start_for('month', null)), 0) as m
    from me
  )
  select s.a, s.w, s.m, private.level_for(s.a),
         coalesce(st.current_streak, 0), coalesce(st.best_streak, 0), st.last_active_week,
         -- Grace: the streak is alive but last week had no new place (one missed week forgiven).
         coalesce(st.current_streak, 0) > 0
           and st.last_active_week < private.period_start_for('week', null) - 7
  from s cross join me left join public.user_streaks st on st.user_id = me.id
  where me.id is not null;
$$;

-- Level, badges and counts for a profile. Counts follow the leaderboard rule (shared places)
-- for other people; you see your full count on your own profile.
create or replace function public.get_user_badges(p_user uuid)
returns table (level int, places int, slug text, name text, description text, category text,
               earned_at timestamptz)
language sql stable security definer set search_path = public, extensions as $$
  with sc as (
    select case when p_user = auth.uid() then unique_places else unique_places_shared end as n
    from public.user_scores where user_id = p_user and period = 'all'
  )
  select private.level_for(coalesce((select n from sc), 0)), coalesce((select n from sc), 0),
         b.slug, b.name, b.description, b.category, ub.earned_at
  from (select 1) one
  left join public.user_badges ub on ub.user_id = p_user
  left join public.badges b on b.id = ub.badge_id
  where auth.uid() is not null and not private.is_blocked_between(auth.uid(), p_user)
  order by ub.earned_at nulls last;
$$;

-- Up to 2 badges per author for verdict cards (credibility first: behaviour badges).
create or replace function public.get_badges_for_users(p_users uuid[])
returns table (user_id uuid, slug text, name text)
language sql stable security definer set search_path = public, extensions as $$
  select x.user_id, x.slug, x.name from (
    select ub.user_id, b.slug, b.name,
           row_number() over (partition by ub.user_id
                              order by (b.category = 'behaviour') desc, ub.earned_at) as rn
    from public.user_badges ub join public.badges b on b.id = ub.badge_id
    where ub.user_id = any (p_users[1:200]) and auth.uid() is not null
      and not private.is_blocked_between(auth.uid(), ub.user_id)
  ) x where x.rn <= 2;
$$;

-- ---------------------------------------------------------------------------------------
-- P6-03 post-log feedback: did it count, and who is just ahead of me this month?
-- ---------------------------------------------------------------------------------------
create or replace function public.get_visit_feedback(p_visit uuid)
returns table (counted boolean, counts_in_periods boolean, reason text, month_score int,
               rival_name text, rival_ahead_by int)
language plpgsql stable security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); v public.visits%rowtype; why text; ms int; rn text; ra int;
begin
  select * into v from public.visits where id = p_visit and user_id = uid;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;

  why := case
    when v.counts_all_time and v.counts_in_periods then 'new_place'
    when v.counts_all_time then 'all_time_only'
    when not v.is_first_visit then 'repeat'
    when (select count(*) from public.visits x where x.user_id = uid and x.visited_on = v.visited_on
            and x.counts_all_time and (x.logged_at, x.id) < (v.logged_at, v.id)) >= 5 then 'daily_cap'
    else 'chain_cap' end;

  select coalesce(unique_places_shared, 0) into ms from public.user_scores
   where user_id = uid and period = 'month' and period_start = private.period_start_for('month', null);

  select l.display_name, l.score - coalesce(ms, 0) + 1 into rn, ra
    from public.get_leaderboard('friends', null, 'month', null) l
   where not l.is_me and l.score >= coalesce(ms, 0)
   order by l.score asc, l.rank desc limit 1;

  return query select v.counts_all_time, v.counts_in_periods, why, coalesce(ms, 0), rn, ra;
end $$;

-- ---------------------------------------------------------------------------------------
-- P6-07 verified visit: the device is within 150 m of the place. Optional; never blocks
-- logging; verified visits only break ties on boards.
-- ---------------------------------------------------------------------------------------
create or replace function public.verify_visit(p_visit uuid, p_lat double precision, p_lng double precision)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user(); ok boolean;
begin
  if p_lat is null or p_lng is null or abs(p_lat) > 90 or abs(p_lng) > 180 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  select st_dwithin(p.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, 150) into ok
    from public.visits v join public.places p on p.id = v.place_id
   where v.id = p_visit and v.user_id = uid
     -- Only around the time of the visit, so you can't verify old visits later from nearby.
     and v.logged_at > now() - interval '12 hours';
  if ok is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if ok then update public.visits set verified = true where id = p_visit; end if;
  return ok;
end $$;

-- ---------------------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------------------
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
grant execute on function
  public.get_leaderboard(text, uuid, score_period, date), public.set_group_leaderboard(uuid, boolean),
  public.get_my_progress(), public.get_user_badges(uuid), public.get_badges_for_users(uuid[]),
  public.get_visit_feedback(uuid), public.verify_visit(uuid, double precision, double precision)
  to authenticated;

-- Award badges people have already earned.
do $$
declare u uuid;
begin
  for u in select distinct user_id from public.visits loop
    perform private.evaluate_badges(u);
  end loop;
end $$;
