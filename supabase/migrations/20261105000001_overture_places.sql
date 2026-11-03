-- Overture Maps places as a second open data source (decision 2026-11-03, see DECISIONS.md).
-- Overture Places is CDLA-Permissive-2.0 / Apache-2.0 / CC0 per source; attribution in the footer.
-- Our own UUIDs stay the primary key; overture_id is an optional link like osm_id.
set search_path = public, extensions;

alter table public.places drop constraint places_source_check;
alter table public.places add constraint places_source_check
  check (source in ('osm','overture','google','user'));
alter table public.places add column overture_id text unique;

-- Import one batch of Overture rows (JSON array). Idempotent:
--   * rows whose overture_id is already stored are skipped;
--   * rows that match an existing place (similar name within 75 m) are not inserted; the first
--     such row links its overture_id onto that place if it has none;
--   * everything else is inserted (confirmed when Overture is confident, otherwise unverified).
-- Area is resolved by the places trigger. Service role / SQL editor only.
create or replace function public.admin_import_overture(p_rows jsonb)
returns table (inserted int, linked int, skipped int)
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_inserted int := 0;
  v_linked int := 0;
  v_skipped int := 0;
begin
  -- Several batches may run in one transaction (SQL editor): start from clean temp tables.
  drop table if exists pg_temp._ov, pg_temp._match;
  create temp table _ov on commit drop as
  select x.overture_id, left(btrim(x.name), 120) as name, x.lat, x.lng, x.type::place_type as type,
         coalesce(x.diet_flags, '{}') as diet_flags, coalesce(x.cuisine_tags, '{}') as cuisine_tags,
         x.brand_slug, x.brand_name, coalesce(x.confident, false) as confident,
         public.normalize_name(x.name) as nn,
         st_setsrid(st_makepoint(x.lng, x.lat), 4326)::geography as g
  from jsonb_to_recordset(p_rows) as x(overture_id text, name text, lat double precision,
       lng double precision, type text, diet_flags text[], cuisine_tags text[], brand_slug text,
       brand_name text, confident boolean)
  where x.overture_id is not null and nullif(btrim(x.name), '') is not null;

  delete from _ov o using public.places p where p.overture_id = o.overture_id;
  get diagnostics v_skipped = row_count;

  -- Best existing match per incoming row.
  create temp table _match on commit drop as
  select o.overture_id, m.id as place_id, m.has_overture
  from _ov o
  cross join lateral (
    select p.id, p.overture_id is not null as has_overture
    from public.places p
    where p.status <> 'merged'
      and st_dwithin(p.geom, o.g, 75)
      and (similarity(p.name_normalized, o.nn) >= 0.45
           or (length(o.nn) >= 4 and length(p.name_normalized) >= 4
               and (p.name_normalized like '%' || o.nn || '%' or o.nn like '%' || p.name_normalized || '%')))
    order by similarity(p.name_normalized, o.nn) desc, st_distance(p.geom, o.g)
    limit 1
  ) m;

  update public.places p
     set overture_id = l.overture_id,
         cuisine_tags = case when cardinality(p.cuisine_tags) = 0 then o.cuisine_tags else p.cuisine_tags end
    from (select distinct on (place_id) place_id, overture_id
            from _match where not has_overture order by place_id, overture_id) l
    join _ov o on o.overture_id = l.overture_id
   where p.id = l.place_id and p.overture_id is null;
  get diagnostics v_linked = row_count;

  delete from _ov o using _match m where m.overture_id = o.overture_id;
  v_skipped := v_skipped + (select count(*) from _match)::int - v_linked;

  insert into public.brands (slug, name)
  select distinct on (brand_slug) brand_slug, brand_name from _ov
   where brand_slug is not null and brand_name is not null
   order by brand_slug
  on conflict (slug) do nothing;

  insert into public.places (name, geom, type, diet_flags, cuisine_tags, brand_id, source,
                             overture_id, status)
  select o.name, o.g, o.type, o.diet_flags, o.cuisine_tags, b.id, 'overture', o.overture_id,
         case when o.confident then 'confirmed' else 'unverified' end::place_status
    from _ov o
    left join public.brands b on b.slug = o.brand_slug;
  get diagnostics v_inserted = row_count;

  return query select v_inserted, v_linked, v_skipped;
end $$;

revoke execute on function public.admin_import_overture(jsonb) from public, anon, authenticated;
grant execute on function public.admin_import_overture(jsonb) to service_role;
