-- Review layer follows visit visibility; memory layer (memories, memory photos, companions)
-- is stricter (threats 7 and 9).
begin;
\ir _helpers.psql

select plan(12);

select tests.create_user('author') as author \gset
select tests.create_user('friend') as friend \gset
select tests.create_user('follower') as follower \gset
select tests.create_user('stranger') as stranger \gset
select tests.make_place() as place \gset
select tests.make_friends(:'author', :'friend');
select tests.make_follow(:'follower', :'author');

insert into visits (id, user_id, place_id, verdict, visibility)
values ('11111111-1111-1111-1111-111111111111', :'author', :'place', 'go', 'public');

insert into reviews (visit_id, note) values ('11111111-1111-1111-1111-111111111111', 'Berry pulao is the move');
insert into memories (visit_id, private_note) values ('11111111-1111-1111-1111-111111111111', 'Mom''s birthday');
insert into visit_photos (visit_id, kind, storage_path) values
  -- Real paths: {author}/{visit}/{uuid}.webp (the Phase 4 guard rejects anything else).
  ('11111111-1111-1111-1111-111111111111', 'review',
   :'author' || '/11111111-1111-1111-1111-111111111111/00000000-0000-0000-0000-00000000000a.webp'),
  ('11111111-1111-1111-1111-111111111111', 'memory',
   :'author' || '/11111111-1111-1111-1111-111111111111/00000000-0000-0000-0000-00000000000b.webp');
insert into visit_companions (visit_id, user_id) values ('11111111-1111-1111-1111-111111111111', :'friend');

-- review layer follows the public visit
select tests.authenticate_as(:'stranger');
select is((select count(*)::int from reviews), 1, 'stranger sees the review on a public visit');
select is((select count(*)::int from visit_photos), 1, 'stranger sees only the review photo');
select is((select count(*)::int from memories), 0, 'stranger cannot see a private memory');
select is((select count(*)::int from visit_companions), 0, 'stranger cannot see companions');

select tests.authenticate_as(:'friend');
select is((select count(*)::int from memories), 0, 'friend cannot see a private memory');
select is((select count(*)::int from visit_companions), 1, 'tagged friend sees their own tag');
select is((select count(*)::int from visit_photos where kind = 'memory'), 0, 'friend cannot see a private memory photo');

-- memory shared with friends
reset role;
update memories set visibility = 'friends' where visit_id = '11111111-1111-1111-1111-111111111111';
select tests.authenticate_as(:'friend');
select is((select count(*)::int from memories), 1, 'friend sees a friends-visibility memory');
select is((select count(*)::int from visit_photos where kind = 'memory'), 1, 'friend sees its memory photo');
select tests.authenticate_as(:'follower');
select is((select count(*)::int from memories), 0, 'follower never sees memories');

-- writes
select tests.authenticate_as(:'stranger');
select throws_ok($$ insert into reviews (visit_id, note) values ('11111111-1111-1111-1111-111111111111', 'spam') $$,
  '42501', null, 'cannot add a review to someone else''s visit');
select throws_ok(format('insert into visit_companions (visit_id, user_id) values (%L, %L)', '11111111-1111-1111-1111-111111111111', :'stranger'),
  '42501', null, 'cannot tag yourself on someone else''s visit');

select * from finish();
rollback;
