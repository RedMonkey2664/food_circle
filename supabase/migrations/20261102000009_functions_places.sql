-- 0009 place functions (PLACES_DATA.md §4-6)
set search_path = public, extensions;

-- Internal: resolve a point to an area (polygon first, else nearest centroid within 3 km).
create or replace function private.resolve_area(p geography) returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(
    (select a.id from public.areas a
      where a.geom is not null and st_covers(a.geom, p::geometry)
      order by a.kind = 'neighbourhood' desc   -- prefer the most specific polygon
      limit 1),
    (select a.id from public.areas a
      where a.centroid is not null and a.kind <> 'region'
        and st_dwithin(a.centroid::geography, p, 3000)
      order by a.centroid::geography <-> p
      limit 1)
  );
$$;
revoke all on function private.resolve_area(geography) from public;
grant execute on function private.resolve_area(geography) to authenticated, service_role;

-- RPC: search our own places table (Phase 1 UI; written now with the schema).
create or replace function public.search_places(
  p_query text,
  p_lat double precision default null,
  p_lng double precision default null,
  p_limit int default 20)
returns table (id uuid, name text, area_name text, type place_type, diet_flags text[],
               distance_m double precision, rank real)
language sql stable
set search_path = public, extensions
set pg_trgm.similarity_threshold = 0.2
as $$
  with q as (
    select public.normalize_name(left(p_query, 120)) as nq,
           case when p_lat is null or p_lng is null then null
                else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end as pt
  )
  select p.id, p.name, a.name, p.type, p.diet_flags,
         case when q.pt is null then null else st_distance(p.geom, q.pt) end as distance_m,
         (similarity(p.search_text, q.nq)
          + case when p.name_normalized like q.nq || '%' then 0.3 else 0 end
          + case when q.pt is null then 0
                 else greatest(0, 0.2 - st_distance(p.geom, q.pt) / 50000.0) end)::real as rank
  from public.places p
  cross join q
  left join public.areas a on a.id = p.area_id
  where p.status not in ('merged','closed')
    and length(q.nq) >= 2
    and (p.search_text % q.nq or p.search_text like '%' || q.nq || '%')
  order by rank desc, p.name
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- RPC: duplicate candidates near a point (Phase 5 UI; written now per PLACES_DATA.md §6).
create or replace function public.find_place_candidates(
  p_name text, p_lat double precision, p_lng double precision, p_radius_m int default 50)
returns table (id uuid, name text, area_name text, distance_m double precision,
               name_similarity real, status place_status)
language sql stable set search_path = public, extensions as $$
  with x as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as pt,
                    public.normalize_name(left(p_name, 120)) as nq)
  select p.id, p.name, a.name, st_distance(p.geom, x.pt), similarity(p.name_normalized, x.nq), p.status
  from public.places p
  cross join x
  left join public.areas a on a.id = p.area_id
  where p.status <> 'merged'
    and (
         (st_dwithin(p.geom, x.pt, least(greatest(coalesce(p_radius_m, 50), 1), 500))
            and similarity(p.name_normalized, x.nq) >= 0.3)
      or (st_dwithin(p.geom, x.pt, 200) and similarity(p.name_normalized, x.nq) >= 0.7)
    )
  order by similarity(p.name_normalized, x.nq) desc, st_distance(p.geom, x.pt)
  limit 5;
$$;

-- Only signed-in users may call these RPCs (anonymous visitors see nothing in Phase 0/1).
revoke execute on function public.search_places(text, double precision, double precision, int) from public, anon;
revoke execute on function public.find_place_candidates(text, double precision, double precision, int) from public, anon;
grant execute on function public.search_places(text, double precision, double precision, int) to authenticated;
grant execute on function public.find_place_candidates(text, double precision, double precision, int) to authenticated;
