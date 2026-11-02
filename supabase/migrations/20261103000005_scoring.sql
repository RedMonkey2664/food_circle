-- P1-09 Scoring flags (SCORING_BADGES.md §1-3, §5). The ONLY place points are computed.
-- Recomputed from raw visits on every visit insert / delete / relevant update.
set search_path = public, extensions;

create or replace function private.refresh_user_scores(p_user uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from public.user_scores where user_id = p_user;

  -- all time
  insert into public.user_scores (user_id, period, period_start,
                                  unique_places, unique_places_shared, unique_areas, unique_cuisines)
  select p_user, 'all', date '1970-01-01',
         count(distinct v.place_id),
         count(distinct v.place_id) filter (where v.visibility <> 'private'),
         count(distinct p.area_id),
         count(distinct c.cuisine)
  from public.visits v
  join public.places p on p.id = v.place_id
  left join lateral unnest(p.cuisine_tags) as c(cuisine) on true
  where v.user_id = p_user and v.counts_all_time
  having count(*) > 0;

  -- weekly (Monday start) and monthly, non-backdated only
  insert into public.user_scores (user_id, period, period_start,
                                  unique_places, unique_places_shared, unique_areas, unique_cuisines)
  select p_user, per.period, per.pstart,
         count(distinct v.place_id),
         count(distinct v.place_id) filter (where v.visibility <> 'private'),
         count(distinct p.area_id),
         count(distinct c.cuisine)
  from public.visits v
  join public.places p on p.id = v.place_id
  left join lateral unnest(p.cuisine_tags) as c(cuisine) on true
  cross join lateral (values
      ('week'::score_period,  v.visited_on - (extract(isodow from v.visited_on)::int - 1)),
      ('month'::score_period, date_trunc('month', v.visited_on::timestamp)::date)
  ) as per(period, pstart)
  where v.user_id = p_user and v.counts_in_periods
  group by per.period, per.pstart;
end $$;

-- Weekly new-place streak with one grace week (SCORING_BADGES.md §5).
create or replace function private.refresh_user_streak(p_user uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  w date; prev date := null; gap int;
  cur int := 0; best int := 0;
  today date := (now() at time zone 'Asia/Kolkata')::date;
  this_week date := today - (extract(isodow from today)::int - 1);
begin
  for w in
    select distinct v.visited_on - (extract(isodow from v.visited_on)::int - 1)
    from public.visits v
    where v.user_id = p_user and v.counts_in_periods
    order by 1
  loop
    if prev is null then cur := 1;
    else
      gap := (w - prev) / 7;
      if gap = 1 or gap = 2 then cur := cur + 1;   -- gap of 2 = one missed week, forgiven
      else cur := 1; end if;
    end if;
    best := greatest(best, cur);
    prev := w;
  end loop;

  -- Still current if the last active week is this week, last week, or (grace) the week before.
  if prev is null or (this_week - prev) / 7 > 2 then cur := 0; end if;

  insert into public.user_streaks (user_id, current_streak, best_streak, last_active_week, updated_at)
  values (p_user, cur, best, prev, now())
  on conflict (user_id) do update
     set current_streak = excluded.current_streak, best_streak = excluded.best_streak,
         last_active_week = excluded.last_active_week, updated_at = now();
end $$;

-- Badge engine arrives in Phase 6 (SCORING_BADGES.md §6). Stub so the pipeline is complete.
create or replace function private.evaluate_badges(p_user uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform p_user;
end $$;

create or replace function private.recompute_visit_flags(p_user uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  r record;
  seen uuid[] := '{}';
  day_counts jsonb := '{}'::jsonb;     -- '2026-10-14' -> n
  brand_month jsonb := '{}'::jsonb;    -- '<brand uuid>|2026-10' -> n
  v_first boolean; v_backdated boolean; v_counts boolean;
  v_day text; v_bm text; v_logged_ist date;
begin
  for r in
    select v.id, v.place_id, v.visited_on, v.logged_at, p.brand_id
    from public.visits v join public.places p on p.id = v.place_id
    where v.user_id = p_user
    order by v.logged_at, v.id
  loop
    v_first := not (r.place_id = any(seen));
    if v_first then seen := seen || r.place_id; end if;

    v_logged_ist := (r.logged_at at time zone 'Asia/Kolkata')::date;
    v_backdated := r.visited_on < v_logged_ist - 1;

    v_counts := false;
    if v_first then
      v_day := r.visited_on::text;
      if coalesce((day_counts->>v_day)::int, 0) < 5 then
        if r.brand_id is null then
          v_counts := true;
        else
          v_bm := r.brand_id::text || '|' || to_char(r.visited_on, 'YYYY-MM');
          if coalesce((brand_month->>v_bm)::int, 0) < 3 then
            brand_month := jsonb_set(brand_month, array[v_bm],
                                     to_jsonb(coalesce((brand_month->>v_bm)::int, 0) + 1));
            v_counts := true;
          end if;
        end if;
        if v_counts then
          day_counts := jsonb_set(day_counts, array[v_day],
                                  to_jsonb(coalesce((day_counts->>v_day)::int, 0) + 1));
        end if;
      end if;
    end if;

    update public.visits
       set is_first_visit = v_first,
           is_backdated = v_backdated,
           counts_all_time = v_counts,
           counts_in_periods = (v_counts and not v_backdated)
     where id = r.id
       and (is_first_visit, is_backdated, counts_all_time, counts_in_periods)
           is distinct from (v_first, v_backdated, v_counts, (v_counts and not v_backdated));
  end loop;

  perform private.refresh_user_scores(p_user);
  perform private.refresh_user_streak(p_user);
  perform private.evaluate_badges(p_user);
end $$;

-- Trigger. `update of` lists columns, so the flag updates above never re-fire it.
-- Bulk operations (place merges) can switch it off with app.skip_recompute = 'on'.
create or replace function private.trg_visits_recompute() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if current_setting('app.skip_recompute', true) = 'on' then
    return null;
  end if;
  if tg_op = 'DELETE' then
    perform private.recompute_visit_flags(old.user_id);
  else
    perform private.recompute_visit_flags(new.user_id);
    if tg_op = 'UPDATE' and old.user_id <> new.user_id then
      perform private.recompute_visit_flags(old.user_id);
    end if;
  end if;
  return null;
end $$;

create trigger visits_recompute
  after insert or delete or update of user_id, place_id, visited_on, visibility on public.visits
  for each row execute function private.trg_visits_recompute();

-- RPC: the caller's own scores (API_SPEC.md get_my_scores).
create or replace function public.get_my_scores()
returns table (period score_period, period_start date, unique_places int, unique_places_shared int,
               unique_areas int, unique_cuisines int)
language sql stable security definer set search_path = public, extensions as $$
  select s.period, s.period_start, s.unique_places, s.unique_places_shared, s.unique_areas, s.unique_cuisines
  from public.user_scores s where s.user_id = auth.uid()
  order by s.period, s.period_start desc;
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;
grant execute on function public.get_my_scores() to authenticated;

-- Backfill flags for visits that already exist (dev seed, early testers).
do $$
declare u uuid;
begin
  for u in select distinct user_id from public.visits loop
    perform private.recompute_visit_flags(u);
  end loop;
end $$;
