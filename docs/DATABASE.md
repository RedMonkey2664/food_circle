# DATABASE.md

Postgres on Supabase with PostGIS, pg_trgm and citext. All tables are created in Phase 0 (UI arrives later). The SQL below is the intended design; apply it as migrations, fix any syntax issues against the local Supabase stack, and keep the semantics. Helper functions for security are in SECURITY_PRIVACY.md, scoring functions in SCORING_BADGES.md, place functions in PLACES_DATA.md.

Conventions:
- uuid primary keys with `gen_random_uuid()`, `created_at timestamptz default now()`.
- Every function that must bypass RLS is `security definer` with `set search_path = public, extensions`.
- Enable extensions in the `extensions` schema if Supabase requires it, and keep that schema on the search_path.
- Product day = Asia/Kolkata. Dates like `visited_on` are IST calendar dates.

## Migration order

```
0001_extensions_enums.sql
0002_reference_areas_brands.sql
0003_places.sql
0004_profiles_social.sql         profiles, friendships, follows, blocks, reports, admin_audit
0005_visits_reviews_memories.sql
0006_groups_invites.sql
0007_scoring_badges_tables.sql
0008_functions_security.sql      helper functions (SECURITY_PRIVACY.md)
0009_functions_places.sql        (PLACES_DATA.md)
0010_functions_scoring.sql       (SCORING_BADGES.md)
0011_functions_feeds.sql         (API_SPEC.md)
0012_rls_policies.sql            (SECURITY_PRIVACY.md)
0013_triggers.sql
0014_seed_reference.sql          badges rows
```

## 1. Extensions and enums

```sql
create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists citext;

create type verdict         as enum ('go','skip','only_for');
create type visibility      as enum ('private','friends','followers','public');
create type place_type      as enum ('restaurant','cafe','street_stall','bakery','sweet_shop','bar','other');
create type place_status    as enum ('unverified','confirmed','merged','closed');
create type request_status  as enum ('pending','accepted');
create type group_role      as enum ('owner','member');
create type invite_kind     as enum ('friend','group');
create type report_target   as enum ('user','visit','place');
create type report_status   as enum ('open','reviewed','actioned','dismissed');
create type score_period    as enum ('week','month','all');
create type companion_status as enum ('tagged','added','dismissed');
```

## 2. Reference tables

```sql
create table areas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                 -- 'bandra-west'
  name text not null,                        -- 'Bandra West'
  kind text not null check (kind in ('suburb','neighbourhood','ward','region')),
  city text not null default 'Mumbai',
  parent_id uuid references areas(id),       -- e.g. region 'western-suburbs'
  centroid geometry(Point,4326),
  geom geometry(MultiPolygon,4326)           -- nullable when only a centroid is known
);
create index areas_geom_gix on areas using gist (geom);
create index areas_centroid_gix on areas using gist (centroid);

create table brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                 -- 'starbucks'
  name text not null
);
```

## 3. Places

```sql
create table places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  name_normalized text not null,             -- set by trigger via normalize_name()
  aliases text[] not null default '{}',
  search_text text not null default '',      -- name_normalized + normalized aliases, set by trigger
  geom geography(Point,4326) not null,
  area_id uuid references areas(id),
  brand_id uuid references brands(id),       -- null for independents; drives the chain cap
  type place_type not null default 'restaurant',
  -- diet_flags values: 'pure_veg','veg_options','jain','halal','egg'
  diet_flags text[] not null default '{}',
  cuisine_tags text[] not null default '{}', -- 'irani_cafe','gujarati_thali','udupi','street_food','vada_pav',...
  source text not null check (source in ('osm','google','user')),
  osm_id text unique,                        -- 'node/123' | 'way/456'
  google_place_id text unique,
  status place_status not null default 'unverified',
  merged_into uuid references places(id),
  created_by uuid,                           -- profiles.id, added after profiles exists
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index places_geom_gix on places using gist (geom);
create index places_name_trgm on places using gin (name_normalized gin_trgm_ops);
create index places_search_trgm on places using gin (search_text gin_trgm_ops);
create index places_area_idx on places (area_id);
create index places_brand_idx on places (brand_id);
```

Triggers on places (before insert or update of name, aliases, geom):
- set `name_normalized = normalize_name(name)` and `search_text`.
- if `area_id` is null, set it with `resolve_area(geom)` (PLACES_DATA.md).
- `set_updated_at()`.

```sql
create or replace function normalize_name(n text) returns text
language sql immutable as $$
  select btrim(regexp_replace(
           regexp_replace(lower(replace(coalesce(n,''), '&', ' and ')), '[^[:alnum:][:space:]]', '', 'g'),
           '\s+', ' ', 'g'))
$$;

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
```

## 4. Profiles and social graph

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique not null check (username ~ '^[a-z0-9_.]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text check (char_length(bio) <= 160),
  avatar_url text,
  home_area_id uuid references areas(id),
  diet_prefs text[] not null default '{}',     -- 'veg','jain','halal','egg','nonveg'
  is_private boolean not null default false,
  default_visibility visibility not null default 'followers',
  is_admin boolean not null default false,
  leaderboards_opt_in boolean not null default true,
  banned_at timestamptz,                       -- set by admin only; RPCs and insert policies reject banned users
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table places add constraint places_created_by_fk
  foreign key (created_by) references profiles(id) on delete set null;

create table friendships (
  user_low uuid not null references profiles(id) on delete cascade,
  user_high uuid not null references profiles(id) on delete cascade,
  requested_by uuid not null references profiles(id) on delete cascade,
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (user_low, user_high),
  check (user_low < user_high),
  check (requested_by in (user_low, user_high))
);
create index friendships_high_idx on friendships (user_high, status);

create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  status request_status not null default 'accepted',
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on follows (following_id, status);

create table blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Mute: hide a friend's items from your own feed, silently
create table mutes (
  muter_id uuid not null references profiles(id) on delete cascade,
  muted_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type report_target not null,
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 500),
  status report_status not null default 'open',
  reviewed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id),
  action text not null,                       -- 'merge_places','close_place','dismiss_report',...
  target text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

Friendship and follow rows are created and changed only through RPCs (API_SPEC.md), never by direct client writes.

Trigger `set_follow_status` (before insert on follows): if the followed profile `is_private`, force `status = 'pending'`, otherwise `'accepted'`.

## 5. Visits, reviews, memories

```sql
create table visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  place_id uuid not null references places(id),
  visited_on date not null,                    -- IST calendar date
  logged_at timestamptz not null default now(),
  verdict verdict not null,
  only_for_text text check (char_length(only_for_text) <= 60),
  visibility visibility not null,
  verified boolean not null default false,     -- set only by verify_visit()
  -- computed by recompute_visit_flags(); clients can never write these
  is_first_visit boolean not null default false,
  is_backdated boolean not null default false,
  counts_all_time boolean not null default false,
  counts_in_periods boolean not null default false,
  check (verdict = 'only_for' or only_for_text is null)
);
create index visits_place_idx on visits (place_id, logged_at desc);
create index visits_user_day_idx on visits (user_id, visited_on desc);
create index visits_user_place_idx on visits (user_id, place_id);

-- Phase 3: share a Friends-visibility visit with specific groups only
create table visit_audience_groups (
  visit_id uuid not null references visits(id) on delete cascade,
  group_id uuid not null,                      -- fk added after groups table
  primary key (visit_id, group_id)
);

-- Phase 4: optional layers
create table reviews (
  visit_id uuid primary key references visits(id) on delete cascade,
  note text check (char_length(note) <= 2000),
  price_per_head integer check (price_per_head between 0 and 100000),
  occasion_tags text[] not null default '{}',  -- 'family_dinner','date','group_of_10','late_night','post_exam','pure_veg_family'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table review_dishes (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references visits(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  name_normalized text not null,
  verdict verdict not null check (verdict in ('go','skip')),
  created_at timestamptz not null default now()
);
create index review_dishes_idx on review_dishes (visit_id);
create index review_dishes_name_idx on review_dishes (name_normalized);

create table visit_photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references visits(id) on delete cascade,
  kind text not null check (kind in ('review','memory')),
  storage_path text not null,                  -- '{user_id}/{visit_id}/{uuid}.webp'
  width int, height int,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Phase 5: private memory layer
create table memories (
  visit_id uuid primary key references visits(id) on delete cascade,
  private_note text check (char_length(private_note) <= 2000),
  mood text check (char_length(mood) <= 30),
  occasion text check (char_length(occasion) <= 60),   -- free text: "Mom's birthday"
  visibility visibility not null default 'private' check (visibility in ('private','friends')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table visit_companions (
  visit_id uuid not null references visits(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status companion_status not null default 'tagged',
  primary key (visit_id, user_id)
);
```

Deleting a review layer means deleting rows from `reviews`, `review_dishes` and `visit_photos(kind='review')` for that visit. The visit and its point remain.

Validation trigger on visits (before insert or update of visited_on): reject `visited_on` later than today in IST. Also reject visits to places with status `merged` (client must follow `merged_into`).

## 6. Groups and invites

```sql
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  kind text not null default 'custom' check (kind in ('family','friends','custom')),
  is_private boolean not null default true,
  owner_id uuid not null references profiles(id) on delete cascade,
  leaderboard_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on group_members (user_id);

alter table visit_audience_groups
  add constraint vag_group_fk foreign key (group_id) references groups(id) on delete cascade;

create table invites (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                   -- 22+ random url-safe chars, never sequential
  kind invite_kind not null,
  created_by uuid not null references profiles(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  max_uses int not null default 20,
  uses int not null default 0,
  revoked_at timestamptz
);

create table invite_redemptions (
  invite_id uuid not null references invites(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (invite_id, user_id)
);
```

Trigger `group_member_must_be_friend` (before insert on group_members): the new member must be an accepted friend of the group owner, unless they are the owner. This is what stops groups becoming a backdoor for strangers.

Trigger `audience_groups_only_for_friends` (before insert on visit_audience_groups): the visit's visibility must be `friends`, the author must be a member of the group.

## 7. Scoring, badges, matches

```sql
create table user_scores (
  user_id uuid not null references profiles(id) on delete cascade,
  period score_period not null,
  period_start date not null,                  -- Monday for 'week', 1st for 'month', 1970-01-01 for 'all'
  unique_places int not null default 0,        -- all counted visits (shown to the user themself)
  unique_places_shared int not null default 0, -- counted visits with visibility <> 'private' (used by leaderboards)
  unique_areas int not null default 0,
  unique_cuisines int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period, period_start)
);

create table user_streaks (
  user_id uuid primary key references profiles(id) on delete cascade,
  current_streak int not null default 0,
  best_streak int not null default 0,
  last_active_week date,
  updated_at timestamptz not null default now()
);

create table badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  category text not null check (category in ('exploration','culture','behaviour','streak')),
  rule jsonb not null,                         -- see SCORING_BADGES.md
  tier int not null default 1,
  is_active boolean not null default true
);

create table user_badges (
  user_id uuid not null references profiles(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table taste_matches (
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  shared_places int not null,
  agreed int not null,
  rate numeric(5,2) not null,                  -- agreed / shared_places * 100
  updated_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

-- Phase 5: users suggest corrections (diet flags, closed, moved, cuisine)
create table place_suggestions (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  field text not null check (field in ('diet_flags','cuisine_tags','type','closed','moved','name')),
  value jsonb not null,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);
```

## 8. Triggers summary

```
places     before ins/upd      normalize name, search_text, resolve area, updated_at
profiles   after auth user ins handle_new_user() creates profile with placeholder username
profiles   before update       prevent_admin_escalation(): is_admin cannot change from client sessions
follows    before insert       set_follow_status
visits     before ins/upd      validate date (not future, IST)
visits     after ins/upd/del   recompute_visit_flags(user) (skipped when app.skip_recompute = 'on')
visits     after insert        confirm_place_if_two_users()
group_members before insert    group_member_must_be_friend
visit_audience_groups before insert  audience_groups_only_for_friends
```

New-user trigger:

```sql
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, avatar_url, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), 'New user'),
    new.raw_user_meta_data->>'avatar_url',
    'user_' || substr(replace(new.id::text,'-',''),1,10)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();
```

## 9. Dev seed (supabase/seed.sql or script)

Clearly fake users (`@example.test`) covering every relationship: friend, accepted follower, pending follower, blocked user, private account, stranger. Visits at every visibility level against a handful of real seeded places. Never run the dev seed against production.

## 10. Data lifecycle

- Account deletion removes the profile (cascade): visits, reviews, memories, relationships, scores. Storage objects under `{user_id}/` are deleted by a server action.
- Merged places keep their row (`status = 'merged'`, `merged_into`) so old links redirect.
- Never hard-delete places that have visits.
