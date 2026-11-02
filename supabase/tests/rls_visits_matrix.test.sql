-- Visibility matrix (SECURITY_PRIVACY.md §3): every visibility x viewer relationship.
begin;
\ir _helpers.psql

select plan(19);

select tests.create_user('author') as author \gset
select tests.create_user('privauthor', true) as privauthor \gset
select tests.create_user('friend') as friend \gset
select tests.create_user('follower') as follower \gset
select tests.create_user('pending') as pending \gset
select tests.create_user('stranger') as stranger \gset
select tests.create_user('blocked') as blocked \gset
select tests.make_place() as place \gset

select tests.make_friends(:'author', :'friend');
select tests.make_follow(:'follower', :'author');
select tests.make_follow(:'pending', :'author', 'pending');
select tests.make_block(:'author', :'blocked');
select tests.make_friends(:'privauthor', :'friend');
select tests.make_follow(:'follower', :'privauthor');
select tests.make_follow(:'pending', :'privauthor', 'pending');

-- one visit per visibility for the public-account author, one public visit for the private account
insert into visits (user_id, place_id, verdict, visibility) values
  (:'author', :'place', 'go', 'private'),
  (:'author', :'place', 'go', 'friends'),
  (:'author', :'place', 'go', 'followers'),
  (:'author', :'place', 'go', 'public'),
  (:'privauthor', :'place', 'skip', 'public');

-- public account author
select tests.authenticate_as(:'author');
select set_eq($$ select visibility::text from visits where user_id = (select id from profiles where username = 'author') $$,
  array['private','friends','followers','public'], 'self sees all four');
select tests.authenticate_as(:'friend');
select set_eq($$ select visibility::text from visits where user_id = (select id from profiles where username = 'author') $$,
  array['friends','followers','public'], 'friend sees friends, followers, public');
select tests.authenticate_as(:'follower');
select set_eq($$ select visibility::text from visits where user_id = (select id from profiles where username = 'author') $$,
  array['followers','public'], 'accepted follower sees followers, public');
select tests.authenticate_as(:'pending');
select set_eq($$ select visibility::text from visits where user_id = (select id from profiles where username = 'author') $$,
  array['public'], 'pending follower sees public only');
select tests.authenticate_as(:'stranger');
select set_eq($$ select visibility::text from visits where user_id = (select id from profiles where username = 'author') $$,
  array['public'], 'stranger sees public only');
select tests.authenticate_as(:'blocked');
select is((select count(*)::int from visits where user_id = :'author'), 0, 'blocked user sees nothing');

-- private account author, public visit
select tests.authenticate_as(:'friend');
select is((select count(*)::int from visits where user_id = :'privauthor'), 1, 'private acct: friend sees public visit');
select tests.authenticate_as(:'follower');
select is((select count(*)::int from visits where user_id = :'privauthor'), 1, 'private acct: accepted follower sees public visit');
select tests.authenticate_as(:'pending');
select is((select count(*)::int from visits where user_id = :'privauthor'), 0, 'private acct: pending follower sees nothing');
select tests.authenticate_as(:'stranger');
select is((select count(*)::int from visits where user_id = :'privauthor'), 0, 'private acct: stranger sees nothing');

-- anon
select tests.authenticate_anon();
select throws_ok('select count(*) from visits', '42501', null, 'anon cannot read visits at all');
reset role;

-- writes and computed columns (threat 4)
select tests.authenticate_as(:'stranger');
select lives_ok(format('insert into visits (user_id, place_id, verdict, visibility) values (%L, %L, ''go'', ''public'')', :'stranger', :'place'),
  'user can log their own visit with only a verdict and visibility');
select throws_ok(format('insert into visits (user_id, place_id, verdict, visibility) values (%L, %L, ''go'', ''public'')', :'author', :'place'),
  '42501', null, 'user cannot log a visit as someone else');
select throws_ok(format('insert into visits (user_id, place_id, verdict, visibility, counts_all_time) values (%L, %L, ''go'', ''public'', true)', :'stranger', :'place'),
  '42501', null, 'client cannot set counts_all_time');
select throws_ok(format('update visits set verified = true where user_id = %L', :'stranger'),
  '42501', null, 'client cannot set verified');
select throws_ok(format('insert into visits (user_id, place_id, verdict, visibility, visited_on) values (%L, %L, ''go'', ''public'', current_date + 2)', :'stranger', :'place'),
  'P0001', 'future_date', 'future visits are rejected');

update visits set verdict = 'skip' where user_id = :'author';
reset role;
select is((select count(*)::int from visits where user_id = :'author' and verdict = 'skip'), 0,
  'user cannot update another user''s visits');

-- visited_on defaults to the IST date
select is((select visited_on from visits where user_id = :'stranger'), (now() at time zone 'Asia/Kolkata')::date,
  'visited_on defaults to today in IST');

-- banned users cannot log
update profiles set banned_at = now() where id = :'stranger';
select tests.authenticate_as(:'stranger');
select throws_ok(format('insert into visits (user_id, place_id, verdict, visibility) values (%L, %L, ''go'', ''public'')', :'stranger', :'place'),
  '42501', null, 'banned user cannot log visits');

select * from finish();
rollback;
