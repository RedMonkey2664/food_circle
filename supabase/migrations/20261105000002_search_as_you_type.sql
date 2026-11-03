-- Search-as-you-type over ~17k places: keep every keystroke fast.
--   * 2-letter queries match the start of a name only (btree prefix index), instead of a full scan;
--   * 3+ letters keep trigram + substring matching (GIN trigram index);
--   * matches at the start of the name or of a word rank higher; unverified places rank a bit lower.
set search_path = public, extensions;

create index if not exists places_name_prefix_idx
  on public.places (name_normalized text_pattern_ops)
  where status not in ('merged','closed');

-- PL/pgSQL so each call is planned with the actual query text (the LIKE prefix and trigram
-- indexes are only usable when the planner can see the pattern).
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
  v_nq text := public.normalize_name(left(p_query, 120));
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
          + case when v_pt is null then 0
                 else greatest(0, 0.2 - st_distance(p.geom, v_pt) / 50000.0) end)::real
  from public.places p
  left join public.areas a on a.id = p.area_id
  where p.status not in ('merged','closed')
    and (case when length(v_nq) < 3
              then p.name_normalized like v_nq || '%'
              else (p.search_text % v_nq or p.search_text like '%' || v_nq || '%') end)
  order by 7 desc, p.name
  limit v_limit;
end $$;
