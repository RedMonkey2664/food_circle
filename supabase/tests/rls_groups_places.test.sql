-- Groups (no recursion, members only), audience groups, places write protection.
begin;
\ir _helpers.psql

select plan(9);

select tests.create_user('owner') as owner \gset
select tests.create_user('member') as member \gset
select tests.create_user('outsider') as outsider \gset
select tests.make_friends(:'owner', :'member');
select tests.make_friends(:'owner', :'outsider');
select tests.make_place() as place \gset

insert into groups (id, name, kind, owner_id) values ('22222222-2222-2222-2222-222222222222', 'Family', 'family', :'owner');
insert into group_members (group_id, user_id, role) values
  ('22222222-2222-2222-2222-222222222222', :'owner', 'owner'),
  ('22222222-2222-2222-2222-222222222222', :'member', 'member');

insert into visits (id, user_id, place_id, verdict, visibility)
values ('33333333-3333-3333-3333-333333333333', :'owner', :'place', 'go', 'friends');
insert into visit_audience_groups (visit_id, group_id)
values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222');

select tests.authenticate_as(:'member');
select lives_ok('select * from group_members', 'group_members policy does not recurse');
select is((select count(*)::int from group_members), 2, 'member sees the group roster');
select is((select count(*)::int from groups), 1, 'member sees the group');
select is((select count(*)::int from visits where id = '33333333-3333-3333-3333-333333333333'), 1,
  'member friend sees a visit shared to Family');

select tests.authenticate_as(:'outsider');
select is((select count(*)::int from group_members), 0, 'non-member cannot see the roster');
select is((select count(*)::int from visits where id = '33333333-3333-3333-3333-333333333333'), 0,
  'a friend outside the audience group cannot see the visit');

select throws_ok(format('insert into group_members (group_id, user_id) values (%L, %L)', '22222222-2222-2222-2222-222222222222', :'outsider'),
  '42501', null, 'cannot add yourself to a group directly');

-- places: read for all signed-in users, no direct writes
select is((select count(*)::int from places where id = :'place'), 1, 'signed-in users can read places');
select throws_ok($$ insert into places (name, geom, source) values ('Fake', st_setsrid(st_makepoint(72.8, 19.0), 4326)::geography, 'user') $$,
  '42501', null, 'direct place insert is rejected');

select * from finish();
rollback;
