-- India expansion (2026-11-08): user-added places may be anywhere in India, not only Mumbai.
-- Same function, signature and grants; only the coordinate check changes.
set search_path = public, extensions;

create or replace function public.create_place(
  p_name text, p_lat double precision, p_lng double precision,
  p_type place_type default 'street_stall', p_diet_flags text[] default '{}',
  p_cuisine_tags text[] default '{}', p_force boolean default false)
returns table (status text, place_id uuid, candidates jsonb)
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user(); n text := btrim(coalesce(p_name, '')); cands jsonb; pid uuid;
begin
  if char_length(n) not between 2 and 120 then raise exception 'invalid_input' using errcode = 'P0001', detail = 'name'; end if;
  -- Mumbai region only (generous box around MMR); rejects far-away or swapped coordinates.
  if p_lat is null or p_lng is null or p_lat not between 6.0 and 37.5 or p_lng not between 68.0 and 98.0 then
    raise exception 'invalid_input' using errcode = 'P0001', detail = 'location';
  end if;
  if not (coalesce(p_diet_flags, '{}') <@ array['pure_veg','veg_options','jain','halal','egg'])
     or cardinality(coalesce(p_cuisine_tags, '{}')) > 8 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if (select count(*) from public.places
       where created_by = uid and created_at >= private.ist_day_start()) >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if not coalesce(p_force, false) then
    select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'area_name', c.area_name,
             'distance_m', round(c.distance_m::numeric), 'status', c.status)), '[]'::jsonb)
      into cands
      from public.find_place_candidates(n, p_lat, p_lng, 50) c;
    if jsonb_array_length(cands) > 0 then
      return query select 'candidates'::text, null::uuid, cands;
      return;
    end if;
  end if;

  insert into public.places (name, geom, type, diet_flags, cuisine_tags, source, status, created_by)
  values (n, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_type,
          coalesce(p_diet_flags, '{}'),
          array(select distinct lower(regexp_replace(btrim(t), '[^a-zA-Z0-9]+', '_', 'g'))
                  from unnest(coalesce(p_cuisine_tags, '{}')) t where btrim(t) <> ''),
          'user', 'unverified', uid)
  returning id into pid;
  return query select 'created'::text, pid, '[]'::jsonb;
end $$;
