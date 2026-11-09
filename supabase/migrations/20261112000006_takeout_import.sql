-- Import your own Google Maps reviews / saved places (Google Takeout, 2026-11-09, human
-- request). The file is read on the user's device; this only matches the chosen entries to our
-- places: the nearest place within 150 m whose name is similar. Signed-in users only.
set search_path = public, extensions;

create or replace function public.match_import_places(p_items jsonb)
returns table (idx int, place_id uuid, place_name text, area_name text, distance_m double precision,
               visited boolean)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 300 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  return query
  with items as (
    select (x.ordinality - 1)::int as i, left(btrim(x.value->>'name'), 120) as name,
           public.normalize_name(x.value->>'name') as nn,
           st_setsrid(st_makepoint((x.value->>'lng')::double precision,
                                   (x.value->>'lat')::double precision), 4326)::geography as g
      from jsonb_array_elements(p_items) with ordinality x
     where nullif(btrim(x.value->>'name'), '') is not null
       and (x.value->>'lat') ~ '^-?[0-9.]+$' and (x.value->>'lng') ~ '^-?[0-9.]+$'
  )
  select it.i, m.id, m.name, m.area_name, m.d,
         exists (select 1 from public.visits v where v.user_id = auth.uid() and v.place_id = m.id)
    from items it
    cross join lateral (
      select p.id, p.name, a.name as area_name, st_distance(p.geom, it.g) as d
        from public.places p
        left join public.areas a on a.id = p.area_id
       where p.status not in ('merged', 'closed')
         and st_dwithin(p.geom, it.g, 150)
         and (similarity(p.name_normalized, it.nn) >= 0.35
              or (length(it.nn) >= 4 and length(p.name_normalized) >= 4
                  and (p.name_normalized like '%' || it.nn || '%' or it.nn like '%' || p.name_normalized || '%')))
       order by similarity(p.name_normalized, it.nn) desc, st_distance(p.geom, it.g)
       limit 1
    ) m;
end $$;

revoke all on function public.match_import_places(jsonb) from public, anon;
grant execute on function public.match_import_places(jsonb) to authenticated;
