-- 0002 reference tables (DATABASE.md §2)
set search_path = public, extensions;

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  kind text not null check (kind in ('suburb','neighbourhood','ward','region')),
  city text not null default 'Mumbai',
  parent_id uuid references public.areas(id),
  centroid geometry(Point,4326),
  geom geometry(MultiPolygon,4326)
);
create index areas_geom_gix on public.areas using gist (geom);
create index areas_centroid_gix on public.areas using gist (centroid);
create index areas_parent_idx on public.areas (parent_id);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null
);
