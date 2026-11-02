-- 0006 groups and invites (DATABASE.md §6)
set search_path = public, extensions;

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  kind text not null default 'custom' check (kind in ('family','friends','custom')),
  is_private boolean not null default true,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  leaderboard_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

alter table public.visit_audience_groups
  add constraint vag_group_fk foreign key (group_id) references public.groups(id) on delete cascade;

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code ~ '^[A-Za-z0-9_-]{22,}$'),  -- 22+ random url-safe chars
  kind invite_kind not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  max_uses int not null default 20 check (max_uses > 0),
  uses int not null default 0 check (uses >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check ((kind = 'group') = (group_id is not null))
);
create index invites_created_by_idx on public.invites (created_by);

create table public.invite_redemptions (
  invite_id uuid not null references public.invites(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (invite_id, user_id)
);
