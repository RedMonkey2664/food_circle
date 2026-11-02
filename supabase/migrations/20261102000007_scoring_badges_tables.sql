-- 0007 scoring, badges, matches, suggestions (DATABASE.md §7)
set search_path = public, extensions;

create table public.user_scores (
  user_id uuid not null references public.profiles(id) on delete cascade,
  period score_period not null,
  period_start date not null,                  -- Monday for week, 1st for month, 1970-01-01 for all
  unique_places int not null default 0,
  unique_places_shared int not null default 0,
  unique_areas int not null default 0,
  unique_cuisines int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period, period_start)
);

create table public.user_streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak int not null default 0,
  best_streak int not null default 0,
  last_active_week date,
  updated_at timestamptz not null default now()
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  category text not null check (category in ('exploration','culture','behaviour','streak')),
  rule jsonb not null,
  tier int not null default 1,
  is_active boolean not null default true
);

create table public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table public.taste_matches (
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  shared_places int not null,
  agreed int not null,
  rate numeric(5,2) not null,
  updated_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create table public.place_suggestions (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  field text not null check (field in ('diet_flags','cuisine_tags','type','closed','moved','name')),
  value jsonb not null,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);
