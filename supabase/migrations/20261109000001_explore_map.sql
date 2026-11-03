-- Explore layer on the diary map (human request, 2026-11-03): places in the visible map area
-- that I have not been to or saved, with type and pure-veg filters. Places are public data,
-- so this only reads places/areas plus my own visits and want_to_go rows.
set search_path = public, extensions;

create or replace function public.get_places_in_view(
  p_min_lat double precision, p_min_lng double precision,
  p_max_lat double precision, p_max_lng double precision,
  p_types place_type[] default null, p_pure_veg boolean default false, p_limit int default 300)
returns table (place_id uuid, name text, area_name text, lat double precision, lng double precision,
               type place_type, cuisine_tags text[], diet_flags text[], status place_status)
language sql stable security definer set search_path = public, extensions as $$
  select p.id, p.name, a.name, st_y(p.geom::geometry), st_x(p.geom::geometry),
         p.type, p.cuisine_tags, p.diet_flags, p.status
  from public.places p
  left join public.areas a on a.id = p.area_id
  where auth.uid() is not null
    -- Refuse huge boxes (about 0.25 x 0.25 degrees max): the client asks you to zoom in.
    and p_max_lat - p_min_lat <= 0.25 and p_max_lng - p_min_lng <= 0.25
    and p.geom && st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)::geography
    and p.status not in ('merged', 'closed')
    and (p_types is null or cardinality(p_types) = 0 or p.type = any (p_types))
    and (not coalesce(p_pure_veg, false) or 'pure_veg' = any (p.diet_flags))
    and not exists (select 1 from public.visits v where v.user_id = auth.uid() and v.place_id = p.id)
    and not exists (select 1 from public.want_to_go w where w.user_id = auth.uid() and w.place_id = p.id)
  -- Stable pseudo-random order: when there are more than 300, the ones shown spread evenly
  -- across the view instead of clustering by name. Confirmed places first.
  order by (p.status = 'confirmed') desc, md5(p.id::text)
  limit least(greatest(coalesce(p_limit, 300), 1), 300);
$$;

revoke all on function public.get_places_in_view(double precision, double precision, double precision,
  double precision, place_type[], boolean, int) from public, anon;
grant execute on function public.get_places_in_view(double precision, double precision, double precision,
  double precision, place_type[], boolean, int) to authenticated;
