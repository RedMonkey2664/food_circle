-- India expansion (2026-11-08, human decision; see DECISIONS.md).
--  * Metros + tourist towns from Overture Maps (open data), food places and attractions.
--  * places.category (Overture category, e.g. 'fort', 'cafe') and places.city.
--  * Areas for the new cities (Overture divisions, ODbL) named "<area>, <city>".
--  * Wikimedia (Wikidata CC0 descriptions, Wikipedia CC BY-SA intros, Commons photos with
--    author + licence) in place_info / place_media. Read-only for signed-in users.
set search_path = public, extensions;

-- ---------------------------------------------------------------------------------------
-- Places: category and city
-- ---------------------------------------------------------------------------------------
alter table public.places
  add column if not exists category text check (category is null or char_length(category) <= 60),
  add column if not exists city text check (city is null or char_length(city) <= 60);

update public.places set city = 'Mumbai' where city is null;

-- New places take their city from their area (user-added places, imports without a city).
create or replace function private.places_set_city() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.city is null and new.area_id is not null then
    select a.city into new.city from public.areas a where a.id = new.area_id;
  end if;
  return new;
end $$;
-- "zz": runs after places_before_write has resolved the area.
drop trigger if exists places_zz_city on public.places;
create trigger places_zz_city before insert or update of area_id on public.places
  for each row execute function private.places_set_city();

create index if not exists places_city_idx on public.places (city);

-- ---------------------------------------------------------------------------------------
-- Area resolution: suburb, then the smallest covering area (neighbourhood before city)
-- ---------------------------------------------------------------------------------------
create or replace function private.resolve_area(p geography) returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(
    (select a.id from public.areas a
      where a.geom is not null and st_covers(a.geom, p::geometry)
      order by case a.kind when 'suburb' then 0 when 'neighbourhood' then 1 when 'ward' then 2 else 3 end,
               st_area(a.geom)
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

-- Areas for new cities (service role only). Rows: slug, name, kind, city, geojson (polygon).
create or replace function public.admin_import_areas(p_rows jsonb) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  insert into public.areas (slug, name, kind, city, geom, centroid)
  select x.slug, left(x.name, 120), x.kind, x.city,
         st_multi(st_collectionextract(st_makevalid(st_setsrid(st_geomfromgeojson(x.geojson), 4326)), 3)),
         st_pointonsurface(st_makevalid(st_setsrid(st_geomfromgeojson(x.geojson), 4326)))
    from jsonb_to_recordset(p_rows) as x(slug text, name text, kind text, city text, geojson text)
   where x.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and nullif(btrim(x.name), '') is not null
  on conflict (slug) do update
     set name = excluded.name, kind = excluded.kind, city = excluded.city,
         geom = excluded.geom, centroid = excluded.centroid;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.admin_import_areas(jsonb) from public, anon, authenticated;
grant execute on function public.admin_import_areas(jsonb) to service_role;

-- ---------------------------------------------------------------------------------------
-- Overture import v2: category, city and attractions (never matched against food places)
-- ---------------------------------------------------------------------------------------
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
  drop table if exists pg_temp._ov, pg_temp._match;
  create temp table _ov on commit drop as
  select x.overture_id, left(btrim(x.name), 120) as name, x.lat, x.lng, x.type::place_type as type,
         coalesce(x.diet_flags, '{}') as diet_flags, coalesce(x.cuisine_tags, '{}') as cuisine_tags,
         x.brand_slug, x.brand_name, coalesce(x.confident, false) as confident,
         left(x.category, 60) as category, left(x.city, 60) as city,
         public.normalize_name(x.name) as nn,
         st_setsrid(st_makepoint(x.lng, x.lat), 4326)::geography as g
  from jsonb_to_recordset(p_rows) as x(overture_id text, name text, lat double precision,
       lng double precision, type text, diet_flags text[], cuisine_tags text[], brand_slug text,
       brand_name text, confident boolean, category text, city text)
  where x.overture_id is not null and nullif(btrim(x.name), '') is not null;

  delete from _ov o using public.places p where p.overture_id = o.overture_id;
  get diagnostics v_skipped = row_count;

  create temp table _match on commit drop as
  select o.overture_id, m.id as place_id, m.has_overture
  from _ov o
  cross join lateral (
    select p.id, p.overture_id is not null as has_overture
    from public.places p
    where p.status <> 'merged'
      and (p.type = 'attraction') = (o.type = 'attraction')
      and st_dwithin(p.geom, o.g, 75)
      and (similarity(p.name_normalized, o.nn) >= 0.45
           or (length(o.nn) >= 4 and length(p.name_normalized) >= 4
               and (p.name_normalized like '%' || o.nn || '%' or o.nn like '%' || p.name_normalized || '%')))
    order by similarity(p.name_normalized, o.nn) desc, st_distance(p.geom, o.g)
    limit 1
  ) m;

  update public.places p
     set overture_id = l.overture_id,
         cuisine_tags = case when cardinality(p.cuisine_tags) = 0 then o.cuisine_tags else p.cuisine_tags end,
         category = coalesce(p.category, o.category),
         city = coalesce(p.city, o.city)
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
                             overture_id, status, category, city)
  select o.name, o.g, o.type, o.diet_flags, o.cuisine_tags, b.id, 'overture', o.overture_id,
         case when o.confident then 'confirmed' else 'unverified' end::place_status,
         o.category, o.city
    from _ov o
    left join public.brands b on b.slug = o.brand_slug;
  get diagnostics v_inserted = row_count;

  return query select v_inserted, v_linked, v_skipped;
end $$;
revoke execute on function public.admin_import_overture(jsonb) from public, anon, authenticated;
grant execute on function public.admin_import_overture(jsonb) to service_role;

-- ---------------------------------------------------------------------------------------
-- Wikimedia: descriptions and photos (free licences, credited)
-- ---------------------------------------------------------------------------------------
create table if not exists public.place_info (
  place_id uuid primary key references public.places(id) on delete cascade,
  wikidata text not null check (wikidata ~ '^Q[0-9]+$'),
  short_description text check (short_description is null or char_length(short_description) <= 300),
  wiki_title text check (wiki_title is null or char_length(wiki_title) <= 200),
  wiki_url text check (wiki_url is null or wiki_url ~ '^https://[a-z]+\.wikipedia\.org/'),
  wiki_extract text check (wiki_extract is null or char_length(wiki_extract) <= 1500),
  updated_at timestamptz not null default now()
);

create table if not exists public.place_media (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  source text not null default 'wikimedia' check (source in ('wikimedia')),
  file_title text not null check (char_length(file_title) <= 300),
  thumb_url text not null check (thumb_url ~ '^https://(upload|thumb)\.wikimedia\.org/'),
  width int,
  height int,
  author text check (author is null or char_length(author) <= 200),
  licence text check (licence is null or char_length(licence) <= 80),
  licence_url text check (licence_url is null or licence_url ~ '^https?://'),
  page_url text not null check (page_url ~ '^https://commons\.wikimedia\.org/'),
  position int not null default 0,
  unique (place_id, file_title)
);
create index if not exists place_media_place_idx on public.place_media (place_id, position);

alter table public.place_info enable row level security;
alter table public.place_media enable row level security;
drop policy if exists place_info_select on public.place_info;
create policy place_info_select on public.place_info for select to authenticated using (true);
drop policy if exists place_media_select on public.place_media;
create policy place_media_select on public.place_media for select to authenticated using (true);
revoke all on public.place_info, public.place_media from anon, authenticated;
grant select on public.place_info, public.place_media to authenticated;

-- Matches Wikidata items (with a Commons image) to our places: nearest place within 250 m
-- with a near-identical name, and only of the same kind (an eatery item only matches food
-- places; anything else only matches attractions), so "Starbucks - Chembur" never gets the
-- photo of the Chembur suburb. Rows: qid, kind ('food'|'other'), label, lat, lng,
-- description, wiki_title, wiki_url, extract, file_title, thumb_url, width, height, author,
-- licence, licence_url, page_url.
create or replace function public.admin_import_wikimedia(p_rows jsonb)
returns table (matched int, photos int)
language plpgsql security definer set search_path = public, extensions as $$
declare v_matched int := 0; v_photos int := 0;
begin
  drop table if exists pg_temp._wm;
  create temp table _wm on commit drop as
  select x.*, public.normalize_name(x.label) as nn,
         st_setsrid(st_makepoint(x.lng, x.lat), 4326)::geography as g
    from jsonb_to_recordset(p_rows) as x(qid text, kind text, label text, lat double precision,
         lng double precision, description text, wiki_title text, wiki_url text, extract text,
         file_title text, thumb_url text, width int, height int, author text, licence text,
         licence_url text, page_url text)
   where x.qid ~ '^Q[0-9]+$' and nullif(btrim(x.label), '') is not null;

  drop table if exists pg_temp._wmatch;
  create temp table _wmatch on commit drop as
  select distinct on (m.place_id) w.*, m.place_id
    from _wm w
    cross join lateral (
      select p.id as place_id, similarity(p.name_normalized, w.nn) as sim, st_distance(p.geom, w.g) as d
        from public.places p
       where p.status <> 'merged' and st_dwithin(p.geom, w.g, 250)
         and (p.type = 'attraction') = (coalesce(w.kind, 'other') <> 'food')
         and (similarity(p.name_normalized, w.nn) >= 0.5
              or (length(w.nn) >= 5 and length(p.name_normalized) >= 5
                  and least(length(w.nn), length(p.name_normalized))::numeric
                      / greatest(length(w.nn), length(p.name_normalized)) >= 0.7
                  and (p.name_normalized like '%' || w.nn || '%' or w.nn like '%' || p.name_normalized || '%')))
       order by similarity(p.name_normalized, w.nn) desc, st_distance(p.geom, w.g)
       limit 1
    ) m
   order by m.place_id, m.sim desc, m.d;

  insert into public.place_info (place_id, wikidata, short_description, wiki_title, wiki_url, wiki_extract, updated_at)
  select place_id, qid, left(description, 300), left(wiki_title, 200),
         case when wiki_url ~ '^https://[a-z]+\.wikipedia\.org/' then wiki_url end,
         left(extract, 1500), now()
    from _wmatch
  on conflict (place_id) do update
     set wikidata = excluded.wikidata, short_description = excluded.short_description,
         wiki_title = excluded.wiki_title, wiki_url = excluded.wiki_url,
         wiki_extract = excluded.wiki_extract, updated_at = now();
  get diagnostics v_matched = row_count;

  insert into public.place_media (place_id, file_title, thumb_url, width, height, author, licence, licence_url, page_url)
  select place_id, left(file_title, 300), thumb_url, width, height, left(author, 200), left(licence, 80),
         licence_url, page_url
    from _wmatch
   where file_title is not null and thumb_url ~ '^https://(upload|thumb)\.wikimedia\.org/'
     and page_url ~ '^https://commons\.wikimedia\.org/'
  on conflict (place_id, file_title) do update
     set thumb_url = excluded.thumb_url, width = excluded.width, height = excluded.height,
         author = excluded.author, licence = excluded.licence, licence_url = excluded.licence_url;
  get diagnostics v_photos = row_count;

  return query select v_matched, v_photos;
end $$;
revoke all on function public.admin_import_wikimedia(jsonb) from public, anon, authenticated;
grant execute on function public.admin_import_wikimedia(jsonb) to service_role;
