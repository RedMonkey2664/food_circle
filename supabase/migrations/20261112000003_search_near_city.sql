-- City picker / "Near me" (2026-11-08): searching with a point ranks that city first.
-- Same signature and grants as before; only the ranking changes.
set search_path = public, extensions;

create or replace function public.search_places(
  p_query text,
  p_lat double precision default null,
  p_lng double precision default null,
  p_limit int default 20)
returns table (id uuid, name text, area_name text, type place_type, diet_flags text[],
               distance_m double precision, rank real)
language plpgsql stable
set search_path = public, extensions
as $$
declare
  -- P7-06: fold Hinglish spellings so "wada pao" finds "Vada Pav" (place search_text holds both).
  v_nq text := public.hinglish_fold(public.normalize_name(left(p_query, 120)));
  v_pt geography := case when p_lat is null or p_lng is null then null
                         else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end;
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  if length(v_nq) < 2 then
    return;
  end if;
  return query
  select p.id, p.name, a.name, p.type, p.diet_flags,
         case when v_pt is null then null else st_distance(p.geom, v_pt) end,
         (similarity(p.search_text, v_nq)
          + case when p.name_normalized like v_nq || '%' then 0.4
                 when p.search_text like '% ' || v_nq || '%' then 0.25 else 0 end
          - case when p.status = 'unverified' then 0.08 else 0 end
          -- A chosen city / "near me" point: anything within ~40 km outranks exact-name matches
          -- elsewhere in India, and nearer still ranks a little higher.
          + case when v_pt is null then 0
                 when st_dwithin(p.geom, v_pt, 40000)
                   then 0.6 + greatest(0, 0.2 - st_distance(p.geom, v_pt) / 50000.0)
                 else 0 end)::real
  from public.places p
  left join public.areas a on a.id = p.area_id
  where p.status not in ('merged','closed')
    and (case when length(v_nq) < 3
              then p.name_normalized like v_nq || '%'
              else (p.search_text % v_nq or p.search_text like '%' || v_nq || '%') end)
  order by 7 desc, p.name
  limit v_limit;
end $$;

-- ---------------------------------------------------------------------------------------
-- P7-03: year in food (your own data only)
-- ---------------------------------------------------------------------------------------
create or replace function public.get_year_recap(p_year int)
returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  with mine as (
    select v.*, p.name as place_name, p.cuisine_tags, a.name as area_name
    from public.visits v join public.places p on p.id = v.place_id
    left join public.areas a on a.id = p.area_id
    where v.user_id = auth.uid() and extract(year from v.visited_on) = p_year
  )
  select case when auth.uid() is null then null else jsonb_build_object(
    'year', p_year,
    'visits', (select count(*) from mine),
    'places', (select count(distinct place_id) from mine),
    'new_places', (select count(*) from mine where counts_all_time),
    'areas', (select count(distinct area_name) from mine where area_name is not null),
    'go', (select count(*) from mine where verdict = 'go'),
    'skip', (select count(*) from mine where verdict = 'skip'),
    'only_for', (select count(*) from mine where verdict = 'only_for'),
    'top_areas', coalesce((select jsonb_agg(x) from (
        select area_name as name, count(distinct place_id) as places from mine
        where area_name is not null group by area_name order by 2 desc, 1 limit 3) x), '[]'),
    'top_cuisines', coalesce((select jsonb_agg(x) from (
        select c as name, count(distinct place_id) as places from mine, unnest(cuisine_tags) c
        group by c order by 2 desc, 1 limit 3) x), '[]'),
    'favourite', (select jsonb_build_object('name', place_name, 'visits', count(*)) from mine
        group by place_id, place_name having count(*) > 1 order by count(*) desc, min(logged_at) limit 1),
    'first', (select jsonb_build_object('name', place_name, 'date', visited_on) from mine
        order by visited_on, logged_at limit 1),
    'busiest_month', (select to_char(make_date(p_year, m, 1), 'FMMonth') from (
        select extract(month from visited_on)::int as m, count(*) c from mine group by 1 order by 2 desc, 1 limit 1) bm),
    'by_month', (select jsonb_agg(coalesce(x.c, 0) order by g.m) from generate_series(1, 12) g(m)
        left join (select extract(month from visited_on)::int mm, count(*) c from mine group by 1) x on x.mm = g.m),
    'badges', coalesce((select jsonb_agg(jsonb_build_object('name', b.name, 'icon', b.icon) order by ub.earned_at)
        from public.user_badges ub join public.badges b on b.id = ub.badge_id
        where ub.user_id = auth.uid() and extract(year from ub.earned_at at time zone 'Asia/Kolkata') = p_year), '[]')
  ) end;
$$;

