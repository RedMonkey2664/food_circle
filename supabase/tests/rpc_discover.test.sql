-- Phase 2 discover: taste match threshold + visibility, browse lists, suggestions, stats.
begin;
\ir _helpers.psql

select plan(20);

select tests.create_user('viewer') as me \gset
select tests.create_user('twin') as twin \gset
select tests.create_user('fourplaces') as four \gset
select tests.create_user('pal') as pal \gset
select tests.create_user('palofpal') as fof \gset
select tests.create_user('blocked') as blk \gset
select tests.create_user('vegan') as veg \gset
select tests.create_user('secretive') as sec \gset
update profiles set onboarded_at = now();  -- Discover only lists onboarded people
update profiles set diet_prefs = '{veg,jain}' where id = :'veg';
select tests.make_friends(:'me', :'pal');
select tests.make_friends(:'pal', :'fof');
select tests.make_block(:'me', :'blk');

delete from visits; delete from places; delete from areas;
insert into areas (id, slug, name, kind) values
  ('77777777-0000-0000-0000-000000000001', 'test-region', 'Test Region', 'region');
insert into areas (id, slug, name, kind, parent_id) values
  ('77777777-0000-0000-0000-000000000002', 'test-suburb', 'Test Suburb', 'suburb', '77777777-0000-0000-0000-000000000001');

create temp table p (n int, id uuid);
insert into p select g, tests.make_place('Place ' || g) from generate_series(1, 7) g;
grant select on p to authenticated;
update places set area_id = '77777777-0000-0000-0000-000000000002', cuisine_tags = '{vada_pav}'
 where id in (select id from p where n <= 3);

-- viewer logs 6 public places
insert into visits (user_id, place_id, verdict, visibility)
select :'me', id, case when n % 2 = 0 then 'skip' else 'go' end::verdict, 'public' from p where n <= 6;
-- twin agrees on 5 of 6 shared places
insert into visits (user_id, place_id, verdict, visibility)
select :'twin', id, case when n % 2 = 0 then 'skip' else 'go' end::verdict, 'public' from p where n <= 5;
insert into visits (user_id, place_id, verdict, visibility)
values (:'twin', (select id from p where n = 6), 'go', 'public');
-- fourplaces shares only 4 places
insert into visits (user_id, place_id, verdict, visibility)
select :'four', id, 'go', 'public' from p where n <= 4;
-- secretive shares 6 places, but friends-only: the viewer can't see them
insert into visits (user_id, place_id, verdict, visibility)
select :'sec', id, 'go', 'friends' from p where n <= 6;
-- blocked user also matches perfectly
insert into visits (user_id, place_id, verdict, visibility)
select :'blk', id, case when n % 2 = 0 then 'skip' else 'go' end::verdict, 'public' from p where n <= 6;
-- vegan logs one public vada pav place
insert into visits (user_id, place_id, verdict, visibility) values (:'veg', (select id from p where n = 1), 'go', 'public');

select tests.authenticate_as(:'me');
select lives_ok('select refresh_my_taste_matches()', 'viewer can refresh their own matches');

-- Taste match
select is((select match_rate from get_discover_people('taste') where user_id = :'twin'), 83.33::numeric,
  'twin: 5 of 6 shared places agree = 83.33');
select is((select count(*)::int from get_discover_people('taste') where user_id = :'four'), 0,
  'below 5 shared places: no taste match shown');
select is((select count(*)::int from get_discover_people('taste') where user_id = :'sec'), 0,
  'visits the viewer cannot see never count toward a match');
select is((select count(*)::int from get_discover_people('taste') where user_id = :'blk'), 0,
  'blocked users never appear');
select is((select match_rate from get_profile_stats(:'four')), null::numeric,
  'profile stats hide the match below the threshold');
select is((select shared_places from get_profile_stats(:'twin')), 6, 'profile stats show shared places');

-- Exclusions
select is((select count(*)::int from get_discover_people('suggested') where user_id in (:'me', :'pal')), 0,
  'never suggests yourself or existing friends');
select is((select count(*)::int from get_discover_people('suggested') where user_id = :'blk'), 0,
  'suggestions skip blocked users');

-- Browse
select is((select score from get_discover_people('area', 'test-suburb') where user_id = :'twin'), 3,
  'area: counts visible visits in the suburb');
select is((select score from get_discover_people('area', 'test-region') where user_id = :'twin'), 3,
  'area: a region includes its suburbs');
select is((select count(*)::int from get_discover_people('area', 'test-suburb') where user_id = :'sec'), 0,
  'area: invisible visits never rank anyone');
select is((select score from get_discover_people('cuisine', 'vada_pav') where user_id = :'four'), 3,
  'cuisine: counts visible visits to places with the tag');
select is((select array_agg(user_id)::text from get_discover_people('diet', 'jain')), array[:'veg'::uuid]::text,
  'diet: people who eat that way and have visible visits');
select is((select score from get_discover_people('friends_of_friends') where user_id = :'fof'), 1,
  'friends of friends: counts mutual friends');
select is((select username from get_discover_people('search', 'twi')), 'twin', 'search by username prefix');
select throws_ok($$ select * from get_discover_people('everyone') $$, 'P0001', 'invalid_input', 'unknown kind rejected');

-- After logging
select is((select count(*)::int from suggest_people_after_log((select id from p where n = 1))), 3,
  'after logging: public visitors you don''t follow (twin, fourplaces, vegan)');
reset role;
select tests.make_follow(:'me', :'twin');
select tests.authenticate_as(:'me');
select is((select count(*)::int from suggest_people_after_log((select id from p where n = 1)) where user_id = :'twin'), 0,
  'after logging: people you already follow are not suggested');

select tests.authenticate_anon();
select throws_ok($$ select * from get_discover_people('taste') $$, '42501', null, 'anonymous visitors get nothing');

select * from finish();
rollback;
