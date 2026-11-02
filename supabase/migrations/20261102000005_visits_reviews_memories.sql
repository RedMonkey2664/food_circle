-- 0005 visits, reviews, memories (DATABASE.md §5)
set search_path = public, extensions;

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_id uuid not null references public.places(id),
  visited_on date not null default ((now() at time zone 'Asia/Kolkata')::date),  -- IST calendar date
  logged_at timestamptz not null default now(),
  verdict verdict not null,
  only_for_text text check (char_length(only_for_text) between 1 and 60),
  visibility visibility not null,
  verified boolean not null default false,        -- set only by verify_visit()
  -- computed by recompute_visit_flags(); clients can never write these
  is_first_visit boolean not null default false,
  is_backdated boolean not null default false,
  counts_all_time boolean not null default false,
  counts_in_periods boolean not null default false,
  check (verdict = 'only_for' or only_for_text is null)
);
create index visits_place_idx on public.visits (place_id, logged_at desc);
create index visits_user_day_idx on public.visits (user_id, visited_on desc);
create index visits_user_place_idx on public.visits (user_id, place_id);
create index visits_user_logged_idx on public.visits (user_id, logged_at, id);

-- Phase 3: share a friends-visibility visit with specific groups only
create table public.visit_audience_groups (
  visit_id uuid not null references public.visits(id) on delete cascade,
  group_id uuid not null,                         -- fk added in 0006
  primary key (visit_id, group_id)
);

-- Phase 4: optional layers
create table public.reviews (
  visit_id uuid primary key references public.visits(id) on delete cascade,
  note text check (char_length(note) <= 2000),
  price_per_head integer check (price_per_head between 0 and 100000),
  occasion_tags text[] not null default '{}'
    check (occasion_tags <@ array['family_dinner','date','group_of_10','late_night','post_exam','pure_veg_family']),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_dishes (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  name_normalized text not null,
  verdict verdict not null check (verdict in ('go','skip')),
  created_at timestamptz not null default now()
);
create index review_dishes_idx on public.review_dishes (visit_id);
create index review_dishes_name_idx on public.review_dishes (name_normalized);

create table public.visit_photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  kind text not null check (kind in ('review','memory')),
  storage_path text not null,                     -- '{user_id}/{visit_id}/{uuid}.webp'
  width int, height int,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index visit_photos_visit_idx on public.visit_photos (visit_id);

-- Phase 5: private memory layer
create table public.memories (
  visit_id uuid primary key references public.visits(id) on delete cascade,
  private_note text check (char_length(private_note) <= 2000),
  mood text check (char_length(mood) <= 30),
  occasion text check (char_length(occasion) <= 60),
  visibility visibility not null default 'private' check (visibility in ('private','friends')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.visit_companions (
  visit_id uuid not null references public.visits(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status companion_status not null default 'tagged',
  primary key (visit_id, user_id)
);
create index visit_companions_user_idx on public.visit_companions (user_id);
