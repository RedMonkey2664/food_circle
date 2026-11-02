-- P1-10 home feed: tabs, visibility, mutes, cursor pagination.
begin;
\ir _helpers.psql

select plan(8);

select tests.create_user('viewer') as me \gset
select tests.create_user('pal') as pal \gset
select tests.create_user('pal2') as pal2 \gset
select tests.create_user('celeb') as celeb \gset
select tests.create_user('other') as other \gset
select tests.make_place() as place \gset
select tests.make_friends(:'me', :'pal');
select tests.make_friends(:'me', :'pal2');
select tests.make_follow(:'me', :'celeb');
select tests.make_follow(:'me', :'pal');   -- followed friend stays in Friends only

insert into visits (user_id, place_id, verdict, visibility, logged_at) values
  (:'pal',   :'place', 'go',   'friends',   now() - interval '5 minutes'),
  (:'pal',   :'place', 'skip', 'private',   now() - interval '4 minutes'),
  (:'pal2',  :'place', 'go',   'followers', now() - interval '3 minutes'),
  (:'celeb', :'place', 'go',   'followers', now() - interval '2 minutes'),
  (:'celeb', :'place', 'skip', 'friends',   now() - interval '1 minute'),
  (:'other', :'place', 'go',   'public',    now());

select tests.authenticate_as(:'me');
select is((select count(*)::int from get_home_feed('friends')), 2, 'friends tab: visible friend visits only');
select is((select count(*)::int from get_home_feed('following')), 1,
  'following tab: followed non-friends, visible visits only');
select is((select count(*)::int from get_home_feed('friends') where author_id = :'other'), 0, 'strangers never appear');
select is((select author_id from get_home_feed('friends') limit 1), :'pal2'::uuid, 'newest first');

select tests.authenticate_as(:'me');
select visit_id as first_id, logged_at as first_ts from get_home_feed('friends', 1) \gset
select is((select count(*)::int from get_home_feed('friends', 10, :'first_ts', :'first_id')), 1,
  'cursor returns the rest');

insert into mutes (muter_id, muted_id) values (:'me', :'pal2');
select is((select count(*)::int from get_home_feed('friends') where author_id = :'pal2'), 0, 'muted friends are hidden');

select throws_ok($$ select * from get_home_feed('everyone') $$, 'P0001', 'invalid_input', 'unknown tab rejected');
select tests.authenticate_anon();
select throws_ok($$ select * from get_home_feed('friends') $$, '42501', null, 'anonymous visitors get nothing');

select * from finish();
rollback;
