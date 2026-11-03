-- Phase 5: add place + duplicate check, confirm after 2 users, want to go, map, logbook,
-- on this day, companion tags, suggestions, admin merge.
-- Done-when: a user drops a pin for a vada pav stall, sees it on their map, saves another place
-- as Want to go (different pin); a second user adding the same stall is matched instead of
-- creating a duplicate; an admin merge moves visits and fixes counts.
begin;
\ir _helpers.psql

select plan(26);

select tests.create_user('dropper') as a \gset
select tests.create_user('second') as b \gset
select tests.create_user('admin') as adm \gset
select tests.create_user('outsider') as outsider \gset
update profiles set is_admin = true where id = :'adm';
select tests.make_friends(:'a', :'b');
select tests.make_place('Gokul Cafe') as cafe \gset

-- Add a place ---------------------------------------------------------------------------
select tests.authenticate_as(:'a');
select is((select status from create_place('Anna Vada Pav Stall', 19.0600, 72.8350, 'street_stall', '{pure_veg}', '{Vada Pav}')),
  'created', 'a pin-dropped stall is created');
select id as stall from places where name = 'Anna Vada Pav Stall' \gset
select is((select status::text || '/' || source || '/' || cuisine_tags::text from places where id = :'stall'),
  'unverified/user/{vada_pav}', 'new places start unverified, source user, tags normalized');
select throws_ok($$ select * from create_place('Far Away Dhaba', 28.61, 77.20) $$, 'P0001', 'invalid_input',
  'points outside the Mumbai region are rejected');
insert into visits (user_id, place_id, verdict, visibility) values (:'a', :'stall', 'go', 'friends');

-- Map: Been and Want to go are different pins
insert into want_to_go (user_id, place_id) values (:'a', :'cafe');
select is((select kind from get_my_map() where place_id = :'stall'), 'been', 'the stall is a Been pin on my map');
select is((select kind from get_my_map() where place_id = :'cafe'), 'want', 'the saved cafe is a Want to go pin');

-- Second user: same stall is matched, not duplicated
select tests.authenticate_as(:'b');
select is((select status from create_place('Anna Vadapav', 19.06003, 72.83502, 'street_stall')), 'candidates',
  'a similar name 3 m away is offered as a match instead of creating a duplicate');
select ok((select candidates @> jsonb_build_array(jsonb_build_object('id', :'stall'))
             from create_place('Anna Vadapav', 19.06003, 72.83502, 'street_stall')),
  'the candidate is the existing stall');
select is((select count(*)::int from places where name ilike 'anna vada%'), 1, 'still only one stall');
insert into visits (user_id, place_id, verdict, visibility) values (:'b', :'stall', 'go', 'public');
select is((select status::text from places where id = :'stall'), 'confirmed',
  'a second person logging it confirms the place');
select is((select status from create_place('Anna Vadapav', 19.06003, 72.83502, 'street_stall', '{}', '{}', true)),
  'created', '"No, it is different" creates it anyway');
select id as dup from places where name = 'Anna Vadapav' \gset

-- Want to go ----------------------------------------------------------------------------
select tests.authenticate_as(:'a');
select is((select count(*)::int from want_to_go), 1, 'I see my own list');
insert into visits (user_id, place_id, verdict, visibility) values (:'a', :'cafe', 'go', 'private');
select is((select count(*)::int from want_to_go where place_id = :'cafe'), 0,
  'logging a visit moves the place from Want to go to Been');
select tests.authenticate_as(:'b');
insert into want_to_go (user_id, place_id) values (:'b', :'cafe');
select tests.authenticate_as(:'a');
select is((select count(*)::int from want_to_go where user_id = :'b'), 0, 'nobody else can see my list');
select throws_ok(format($$insert into want_to_go (user_id, place_id) values (%L, %L)$$, :'b', :'stall'),
  '42501', null, 'nobody can add to someone else''s list');

-- Logbook and on this day -----------------------------------------------------------------
select is((select places from get_my_logbook() where kind = 'total'), 2, 'logbook counts unique places');
select is((select places from get_my_logbook() where kind = 'cuisine' and label = 'vada_pav'), 1,
  'logbook counts places by cuisine');
reset role;
insert into visits (user_id, place_id, verdict, visibility, visited_on)
values (:'a', :'stall', 'go', 'private', ((now() at time zone 'Asia/Kolkata')::date - interval '1 year')::date);
select tests.authenticate_as(:'a');
select is((select years_ago from get_on_this_day() limit 1), 1, 'on this day finds last year''s visit');
select tests.authenticate_as(:'b');
select is((select count(*)::int from get_on_this_day()), 0, 'on this day only shows my own visits');

-- Companion tags --------------------------------------------------------------------------
reset role;
insert into visit_companions (visit_id, user_id)
select id, :'b' from visits where user_id = :'a' and place_id = :'stall' order by logged_at limit 1;
select tests.authenticate_as(:'b');
select is((select place_name from get_my_companion_tags()), 'Anna Vada Pav Stall', 'the tagged friend gets the prompt');
select lives_ok(format('select respond_companion_tag(%L, false)',
  (select visit_id from get_my_companion_tags() limit 1)), 'they can dismiss it');
select is((select count(*)::int from get_my_companion_tags()), 0, 'and it is gone');

-- Suggestions and admin --------------------------------------------------------------------
select lives_ok(format($$select suggest_place_fix(%L, 'closed', 'true')$$, :'dup'), 'anyone can report closed');
select throws_ok(format('select admin_resolve_place_suggestion(%L, true)',
  (select id from place_suggestions where place_id = :'dup' limit 1)), 'P0001', 'forbidden',
  'only admins resolve suggestions');
select throws_ok(format('select * from merge_places(%L, %L)', :'dup', :'stall'), 'P0001', 'forbidden',
  'only admins merge');

-- Admin merge moves visits and fixes counts
reset role;
insert into visits (user_id, place_id, verdict, visibility) values (:'outsider', :'dup', 'skip', 'public');
select tests.authenticate_as(:'adm');
select results_eq(format('select moved_visits, affected_users from merge_places(%L, %L)', :'dup', :'stall'),
  $$ values (1, 1) $$, 'admin merge moves the duplicate''s visits');
reset role;  -- count every visit (the admin rightly cannot read others' private visits)
select is((select (select count(*)::int from visits where place_id = :'stall') || '/' ||
                  (select status::text from places where id = :'dup')), '4/merged',
  'all visits now point at the surviving place; the duplicate is marked merged');

select * from finish();
rollback;
