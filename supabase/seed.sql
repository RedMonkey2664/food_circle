-- ============================================================================
-- DEV SEED (P1-13). Clearly fake users (@example.test) and data for local testing.
-- Runs on `pnpm db:reset` against the LOCAL stack only. NEVER run against production.
--
-- Every seed user signs in on localhost via /dev/login with the shared test password
-- below (local test credential only; GoTrue on the hosted project never sees it).
--   DEV_PASSWORD = 'foodcircle-dev'
--
-- Relationship map (from asha's point of view):
--   bilal   FRIEND of asha
--   chitra  FOLLOWS asha (accepted)
--   dev     PENDING follower of priya (private account)
--   priya   PRIVATE account, friend of bilal, followed by chitra
--   sam     stranger to everyone
--   zoya    BLOCKED by asha
--   neha    new user, NOT onboarded yet (to test onboarding)
-- ============================================================================
set search_path = public, extensions;

do $$
declare
  u record;
  pw text := crypt('foodcircle-dev', gen_salt('bf'));
begin
  for u in
    select * from (values
      ('00000000-0000-4000-a000-00000000000a'::uuid, 'asha',   'Asha (dev)',   false, true),
      ('00000000-0000-4000-a000-00000000000b'::uuid, 'bilal',  'Bilal (dev)',  false, true),
      ('00000000-0000-4000-a000-00000000000c'::uuid, 'chitra', 'Chitra (dev)', false, true),
      ('00000000-0000-4000-a000-00000000000d'::uuid, 'dev',    'Dev (dev)',    false, true),
      ('00000000-0000-4000-a000-00000000000e'::uuid, 'priya',  'Priya (dev)',  true,  true),
      ('00000000-0000-4000-a000-00000000000f'::uuid, 'sam',    'Sam (dev)',    false, true),
      ('00000000-0000-4000-a000-000000000010'::uuid, 'zoya',   'Zoya (dev)',   false, true),
      ('00000000-0000-4000-a000-000000000011'::uuid, 'neha',   'Neha (dev)',   false, false)
    ) as t(id, username, display_name, is_private, onboarded)
  loop
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values (
      u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      u.username || '@example.test', pw, now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.display_name),
      now(), now(), '', '', '', '');

    insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), u.id, u.id::text, 'email',
            jsonb_build_object('sub', u.id::text, 'email', u.username || '@example.test', 'email_verified', true),
            now(), now(), now());

    if u.onboarded then
      update public.profiles
         set username = u.username,
             display_name = u.display_name,
             is_private = u.is_private,
             default_visibility = (case when u.is_private then 'friends' else 'followers' end)::visibility,
             onboarded_at = now()
       where id = u.id;
    end if;
  end loop;
end $$;

-- Social graph -------------------------------------------------------------------------
insert into public.friendships (user_low, user_high, requested_by, status, accepted_at) values
  (least('00000000-0000-4000-a000-00000000000a'::uuid, '00000000-0000-4000-a000-00000000000b'::uuid),
   greatest('00000000-0000-4000-a000-00000000000a'::uuid, '00000000-0000-4000-a000-00000000000b'::uuid),
   '00000000-0000-4000-a000-00000000000a', 'accepted', now()),
  (least('00000000-0000-4000-a000-00000000000b'::uuid, '00000000-0000-4000-a000-00000000000e'::uuid),
   greatest('00000000-0000-4000-a000-00000000000b'::uuid, '00000000-0000-4000-a000-00000000000e'::uuid),
   '00000000-0000-4000-a000-00000000000e', 'accepted', now());

insert into public.follows (follower_id, following_id, status) values
  ('00000000-0000-4000-a000-00000000000c', '00000000-0000-4000-a000-00000000000a', 'accepted'),
  ('00000000-0000-4000-a000-00000000000c', '00000000-0000-4000-a000-00000000000e', 'accepted'),
  ('00000000-0000-4000-a000-00000000000d', '00000000-0000-4000-a000-00000000000e', 'pending');

insert into public.blocks (blocker_id, blocked_id) values
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-000000000010');

-- Dev places (source 'user'; the OSM seed adds the real catalogue separately) ----------
insert into public.places (id, name, geom, type, diet_flags, cuisine_tags, source, status) values
  ('00000000-0000-4000-b000-000000000001', 'Dev Irani Cafe',      st_setsrid(st_makepoint(72.8336, 18.9440), 4326)::geography, 'cafe',         '{egg}',      '{irani_cafe}', 'user', 'confirmed'),
  ('00000000-0000-4000-b000-000000000002', 'Dev Misal Corner',    st_setsrid(st_makepoint(72.8430, 19.0176), 4326)::geography, 'restaurant',   '{pure_veg}', '{maharashtrian}', 'user', 'confirmed'),
  ('00000000-0000-4000-b000-000000000003', 'Dev Vada Pav Thela',  st_setsrid(st_makepoint(72.8406, 19.0600), 4326)::geography, 'street_stall', '{pure_veg}', '{vada_pav,street_food}', 'user', 'confirmed'),
  ('00000000-0000-4000-b000-000000000004', 'Dev Udupi Canteen',   st_setsrid(st_makepoint(72.8553, 19.0270), 4326)::geography, 'restaurant',   '{pure_veg,jain}', '{udupi}', 'user', 'confirmed'),
  ('00000000-0000-4000-b000-000000000005', 'Dev Seafood Shack',   st_setsrid(st_makepoint(72.8258, 19.0550), 4326)::geography, 'restaurant',   '{}',         '{malvani}', 'user', 'confirmed');

-- Visits at every visibility level ------------------------------------------------------
insert into public.visits (user_id, place_id, verdict, only_for_text, visibility, visited_on) values
  -- asha (public account): one of each visibility
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-b000-000000000001', 'go',       null,         'public',    current_date - 3),
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-b000-000000000002', 'only_for', 'the misal',  'followers', current_date - 2),
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-b000-000000000003', 'go',       null,         'friends',   current_date - 1),
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-b000-000000000004', 'skip',     null,         'private',   current_date),
  -- bilal (friend of asha)
  ('00000000-0000-4000-a000-00000000000b', '00000000-0000-4000-b000-000000000001', 'go',       null,         'followers', current_date - 5),
  ('00000000-0000-4000-a000-00000000000b', '00000000-0000-4000-b000-000000000005', 'skip',     null,         'friends',   current_date - 1),
  -- chitra (follows asha)
  ('00000000-0000-4000-a000-00000000000c', '00000000-0000-4000-b000-000000000001', 'skip',     null,         'public',    current_date - 4),
  -- priya (private account): public visit is visible only to friends + accepted followers
  ('00000000-0000-4000-a000-00000000000e', '00000000-0000-4000-b000-000000000001', 'go',       null,         'public',    current_date - 2),
  ('00000000-0000-4000-a000-00000000000e', '00000000-0000-4000-b000-000000000002', 'go',       null,         'friends',   current_date - 1),
  -- sam (stranger)
  ('00000000-0000-4000-a000-00000000000f', '00000000-0000-4000-b000-000000000001', 'go',       null,         'public',    current_date - 6),
  ('00000000-0000-4000-a000-00000000000f', '00000000-0000-4000-b000-000000000003', 'only_for', 'the chutney','public',    current_date - 2),
  -- zoya (blocked by asha)
  ('00000000-0000-4000-a000-000000000010', '00000000-0000-4000-b000-000000000001', 'skip',     null,         'public',    current_date - 1);

-- Realistic logged_at: one statement gives every row the same now(), so spread them out by
-- visit date (around lunchtime IST), then recompute scoring flags for the seed users.
update public.visits
   set logged_at = ((visited_on::timestamp + interval '13 hours') at time zone 'Asia/Kolkata')
                   + (random() * interval '2 hours');
do $$
declare u uuid;
begin
  for u in select distinct user_id from public.visits loop
    perform private.recompute_visit_flags(u);
  end loop;
end $$;
