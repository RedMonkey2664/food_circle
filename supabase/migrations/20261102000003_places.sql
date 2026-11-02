-- 0003 places (DATABASE.md §3)
set search_path = public, extensions;

create or replace function public.normalize_name(n text) returns text
language sql immutable parallel safe set search_path = public, extensions as $$
  select btrim(regexp_replace(
           regexp_replace(lower(replace(coalesce(n,''), '&', ' and ')), '[^[:alnum:][:space:]]', '', 'g'),
           '\s+', ' ', 'g'))
$$;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public, extensions as $$
begin new.updated_at = now(); return new; end $$;

create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  name_normalized text not null default '',   -- set by trigger
  aliases text[] not null default '{}',
  search_text text not null default '',       -- set by trigger
  geom geography(Point,4326) not null,
  area_id uuid references public.areas(id),
  brand_id uuid references public.brands(id),
  type place_type not null default 'restaurant',
  diet_flags text[] not null default '{}'
    check (diet_flags <@ array['pure_veg','veg_options','jain','halal','egg']),
  cuisine_tags text[] not null default '{}',
  source text not null check (source in ('osm','google','user')),
  osm_id text unique,
  google_place_id text unique,
  status place_status not null default 'unverified',
  merged_into uuid references public.places(id),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'merged') = (merged_into is not null)),
  check (merged_into is null or merged_into <> id)
);
create index places_geom_gix on public.places using gist (geom);
create index places_name_trgm on public.places using gin (name_normalized gin_trgm_ops);
create index places_search_trgm on public.places using gin (search_text gin_trgm_ops);
create index places_area_idx on public.places (area_id);
create index places_brand_idx on public.places (brand_id);
