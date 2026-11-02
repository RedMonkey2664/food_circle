-- 0004 profiles and social graph (DATABASE.md §4)
set search_path = public, extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique not null check (username ~ '^[a-z0-9_.]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text check (char_length(bio) <= 160),
  avatar_url text,
  home_area_id uuid references public.areas(id),
  diet_prefs text[] not null default '{}'
    check (diet_prefs <@ array['veg','jain','halal','egg','nonveg']),
  is_private boolean not null default false,
  default_visibility visibility not null default 'followers',
  is_admin boolean not null default false,
  leaderboards_opt_in boolean not null default true,
  banned_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.places add constraint places_created_by_fk
  foreign key (created_by) references public.profiles(id) on delete set null;

create table public.friendships (
  user_low uuid not null references public.profiles(id) on delete cascade,
  user_high uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (user_low, user_high),
  check (user_low < user_high),
  check (requested_by in (user_low, user_high)),
  check ((status = 'accepted') = (accepted_at is not null))
);
create index friendships_high_idx on public.friendships (user_high, status);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  status request_status not null default 'accepted',
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id, status);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

-- Mute: hide a friend's items from your own feed, silently
create table public.mutes (
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type report_target not null,
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 500),
  status report_status not null default 'open',
  reviewed_by uuid references public.profiles(id) on delete set null,  -- DECISIONS.md: set null
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);

create table public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,     -- DECISIONS.md: set null
  action text not null,
  target text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
