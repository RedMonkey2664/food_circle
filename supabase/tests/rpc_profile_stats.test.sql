-- P1-11 get_profile_stats: counts respect visibility and blocks.
begin;
\ir _helpers.psql

select plan(5);

select tests.create_user('author') as author \gset
select tests.create_user('friend') as friend \gset
select tests.create_user('stranger') as stranger \gset
select tests.create_user('blocked') as blocked \gset
select tests.make_place() as place \gset
select tests.make_friends(:'author', :'friend');
select tests.make_follow(:'stranger', :'author');
select tests.make_block(:'author', :'blocked');
insert into visits (user_id, place_id, verdict, visibility) values
  (:'author', :'place', 'go', 'public'),
  (:'author', :'place', 'go', 'friends'),
  (:'author', :'place', 'go', 'private');

select tests.authenticate_as(:'friend');
select is((select visits_visible from get_profile_stats(:'author')), 2, 'friend counts public + friends visits');
select is((select (friends, followers, following)::text from get_profile_stats(:'author')), '(1,1,0)',
  'relationship counts');
select tests.authenticate_as(:'stranger');
select is((select visits_visible from get_profile_stats(:'author')), 1, 'stranger counts public visits only');
select tests.authenticate_as(:'author');
select is((select visits_visible from get_profile_stats(:'author')), 3, 'you see all your own visits');
select tests.authenticate_as(:'blocked');
select is((select count(*)::int from get_profile_stats(:'author')), 0, 'blocked users get nothing');

select * from finish();
rollback;
