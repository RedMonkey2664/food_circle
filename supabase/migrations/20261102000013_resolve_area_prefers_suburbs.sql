-- 0013 Area resolution prefers suburbs (found while running the OSM seed, P0-07).
-- With centroid-only areas, "nearest point" picked tiny neighbourhoods (e.g. Pali Village)
-- instead of the suburb (Bandra West), which breaks area badges and logbook counts.
-- Order now: covering polygon > nearest suburb within 3 km > nearest neighbourhood within 3 km.
set search_path = public, extensions;

create or replace function private.resolve_area(p geography) returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(
    (select a.id from public.areas a
      where a.geom is not null and st_covers(a.geom, p::geometry)
      order by (a.kind = 'suburb') desc
      limit 1),
    (select a.id from public.areas a
      where a.kind = 'suburb' and a.centroid is not null
        and st_dwithin(a.centroid::geography, p, 3000)
      order by a.centroid::geography <-> p
      limit 1),
    (select a.id from public.areas a
      where a.kind = 'neighbourhood' and a.centroid is not null
        and st_dwithin(a.centroid::geography, p, 3000)
      order by a.centroid::geography <-> p
      limit 1)
  );
$$;

-- Neighbourhoods get the nearest suburb (within 3 km) as their parent, so they can roll up.
create or replace function private.link_neighbourhoods_to_suburbs() returns void
language sql security definer set search_path = public, extensions as $$
  update public.areas n
     set parent_id = (
       select s.id from public.areas s
        where s.kind = 'suburb' and s.centroid is not null
          and st_dwithin(s.centroid::geography, n.centroid::geography, 3000)
        order by s.centroid::geography <-> n.centroid::geography
        limit 1)
   where n.kind = 'neighbourhood' and n.centroid is not null;
$$;

-- Re-resolve places currently pinned to a neighbourhood (or to nothing).
create or replace function private.reresolve_place_areas() returns int
language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  update public.places p
     set area_id = private.resolve_area(p.geom)
   where p.area_id is null
      or p.area_id in (select id from public.areas where kind = 'neighbourhood');
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function private.link_neighbourhoods_to_suburbs() from public;
revoke all on function private.reresolve_place_areas() from public;
grant execute on function private.link_neighbourhoods_to_suburbs() to service_role;
grant execute on function private.reresolve_place_areas() to service_role;

select private.link_neighbourhoods_to_suburbs();
select private.reresolve_place_areas();

-- Callable by the seed script (secret key only; signed-in users and anon cannot execute it).
create or replace function public.admin_refresh_place_areas() returns int
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform private.link_neighbourhoods_to_suburbs();
  return private.reresolve_place_areas();
end $$;
revoke all on function public.admin_refresh_place_areas() from public, anon, authenticated;
grant execute on function public.admin_refresh_place_areas() to service_role;
