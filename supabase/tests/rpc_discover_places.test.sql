-- Discover > Places: per-tier Go counts (never blended), visibility respected, own places left
-- out, friends ranked first, signed-in only.
begin;
\ir _helpers.psql

select plan(9);

select tests.create_user('viewer') as me \gset
select tests.create_user('buddy') as pal \gset
select tests.create_user('starchef') as star \gset
select tests.create_user('stranger') as stranger \gset
update profiles set onboarded_at = now();
select tests.make_friends(:'me', :'pal');
select tests.make_follow(:'me', :'star');

delete from visits; delete from places;
insert into places (name, geom, source, status, type) values
  ('Friend Cafe',   st_setsrid(st_makepoint(75.800, 26.900), 4326)::geography, 'user', 'confirmed', 'cafe'),
  ('Public Dhaba',  st_setsrid(st_makepoint(75.805, 26.905), 4326)::geography, 'user', 'confirmed', 'restaurant'),
  ('Secret Thela',  st_setsrid(st_makepoint(75.806, 26.906), 4326)::geography, 'user', 'confirmed', 'street_stall'),
  ('My Usual',      st_setsrid(st_makepoint(75.801, 26.901), 4326)::geography, 'user', 'confirmed', 'cafe'),
  ('Far Away Cafe', st_setsrid(st_makepoint(72.830, 19.060), 4326)::geography, 'user', 'confirmed', 'cafe');

insert into visits (user_id, place_id, verdict, visibility, visited_on)
select :'pal'::uuid, id, 'go'::verdict, 'friends'::visibility, current_date from places where name = 'Friend Cafe'
union all select :'star'::uuid, id, 'go'::verdict, 'public'::visibility, current_date from places where name = 'Friend Cafe'
union all select :'stranger'::uuid, id, 'go'::verdict, 'public'::visibility, current_date from places where name = 'Public Dhaba'
union all select :'stranger'::uuid, id, 'skip'::verdict, 'public'::visibility, current_date from places where name = 'Friend Cafe'
union all select :'stranger'::uuid, id, 'go'::verdict, 'private'::visibility, current_date from places where name = 'Secret Thela'
union all select :'pal'::uuid, id, 'go'::verdict, 'friends'::visibility, current_date from places where name = 'My Usual'
union all select :'me'::uuid, id, 'go'::verdict, 'private'::visibility, current_date from places where name = 'My Usual'
union all select :'pal'::uuid, id, 'go'::verdict, 'friends'::visibility, current_date from places where name = 'Far Away Cafe';

select tests.authenticate_as(:'me');
create temp table rec as select * from get_recommended_places(26.90, 75.80);

select is((select name from rec limit 1), 'Friend Cafe', 'friends'' picks rank first');
select is((select friend_go from rec where name = 'Friend Cafe'), 1, 'friend Go counted in the friend tier');
select is((select following_go from rec where name = 'Friend Cafe'), 1, 'followed Go counted in its own tier');
select is((select everyone_go || '/' || everyone_went from rec where name = 'Friend Cafe'), '0/1',
  'a stranger''s Skip stays in the everyone tier, not blended');
select ok(exists(select 1 from rec where name = 'Public Dhaba'), 'public Go from a stranger counts');
select ok(not exists(select 1 from rec where name = 'Secret Thela'), 'private visits never count');
select ok(not exists(select 1 from rec where name = 'My Usual'), 'places I have been to are left out');
select ok(not exists(select 1 from rec where name = 'Far Away Cafe'), 'only places near the point');

select tests.authenticate_anon();
select throws_ok($$ select * from get_recommended_places(26.90, 75.80) $$, '42501', null,
  'signed-out visitors cannot call it');

select * from finish();
rollback;
