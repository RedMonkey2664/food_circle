-- Place summary and verdict list: per tier, never blended, respect visibility and blocks
-- (TESTING.md rpc_summary_feed, SECURITY_PRIVACY threat 5).
begin;
\ir _helpers.psql

select plan(13);

select tests.create_user('viewer') as viewer \gset
select tests.create_user('friend1') as friend1 \gset
select tests.create_user('friend2') as friend2 \gset
select tests.create_user('followed') as followed \gset
select tests.create_user('stranger') as stranger \gset
select tests.create_user('privstranger', true) as privstranger \gset
select tests.create_user('blocked') as blocked \gset
select tests.make_place() as place \gset

select tests.make_friends(:'viewer', :'friend1');
select tests.make_friends(:'viewer', :'friend2');
select tests.make_follow(:'viewer', :'followed');
select tests.make_follow(:'viewer', :'friend1');   -- a friend you also follow is still FRIEND
select tests.make_block(:'blocked', :'viewer');

insert into visits (user_id, place_id, verdict, only_for_text, visibility, visited_on) values
  (:'viewer',   :'place', 'go',       null,        'private',   current_date),
  (:'friend1',  :'place', 'skip',     null,        'public',    current_date - 10),
  (:'friend1',  :'place', 'go',       null,        'friends',   current_date - 1),   -- latest wins
  (:'friend2',  :'place', 'only_for', 'the misal', 'friends',   current_date - 2),
  (:'followed', :'place', 'go',       null,        'followers', current_date - 3),
  (:'followed', :'place', 'skip',     null,        'private',   current_date),       -- invisible, ignored
  (:'stranger', :'place', 'skip',     null,        'public',    current_date - 4),
  (:'stranger', :'place', 'go',       null,        'friends',   current_date),       -- invisible, ignored
  (:'privstranger', :'place', 'go',   null,        'public',    current_date - 1),   -- private acct: invisible
  (:'blocked',  :'place', 'go',       null,        'public',    current_date - 1);   -- blocked: invisible

select tests.authenticate_as(:'viewer');

select results_eq(
  format('select tier, went, go_count, skip_count, only_for_count from get_place_summary(%L) order by tier', :'place'),
  $$ values (0::smallint, 1, 1, 0, 0), (1::smallint, 2, 1, 0, 1), (2::smallint, 1, 1, 0, 0), (3::smallint, 1, 0, 1, 0) $$,
  'summary is per tier, one entry per author (their latest visible visit)');

select is((select count(*)::int from get_place_summary(:'place') where tier not in (0,1,2,3)), 0,
  'no blended or extra rows');

select is((select verdict::text from get_place_verdicts(:'place', 'everyone') where author_id = :'friend1'), 'go',
  'friend shows their latest visit, not the older one');
select is((select tier from get_place_verdicts(:'place', 'everyone') where author_id = :'friend1'), 1::smallint,
  'a friend you also follow is labelled FRIEND');
select is((select verdict::text from get_place_verdicts(:'place', 'everyone') where author_id = :'followed'), 'go',
  'a private visit never replaces a visible one');
select is((select verdict::text from get_place_verdicts(:'place', 'everyone') where author_id = :'stranger'), 'skip',
  'stranger shows only their public visit');
select is((select count(*)::int from get_place_verdicts(:'place', 'everyone') where author_id = :'privstranger'), 0,
  'private account public visits stay hidden from strangers');
select is((select count(*)::int from get_place_verdicts(:'place', 'everyone') where author_id = :'blocked'), 0,
  'blocked users never appear');

select is((select count(*)::int from get_place_verdicts(:'place', 'friends')), 3, 'friends filter: you + 2 friends');
select is((select count(*)::int from get_place_verdicts(:'place', 'friends_following')), 4,
  'friends + following filter');
select is((select array_agg(tier order by ord)::text from (
            select tier, row_number() over () as ord from get_place_verdicts(:'place', 'everyone')) x),
  '{0,1,1,2,3}', 'ordered by tier');

select tests.authenticate_as(:'stranger');
select is((select count(*)::int from get_place_summary(:'place') where tier = 1), 0,
  'stranger sees no friend tier counts for the viewer''s friends');
select is((select sum(went)::int from get_place_summary(:'place')), 3,
  'stranger counts only what they may see: self, friend1''s public visit, and a public visit by someone who blocked a different person');

select * from finish();
rollback;
