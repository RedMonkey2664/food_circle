-- Phase 6: leaderboards, badges, feedback, verified visits.
-- Done-when: a group of 5+ runs a month-long leaderboard; repeating one cafe adds nothing;
-- daily and chain caps work (scoring.test.sql); backdated visits count only toward all-time.
begin;
\ir _helpers.psql

select plan(23);

-- Increasing log times inside one transaction (scoring order follows logged_at).
create or replace function tests.tick(n int) returns timestamptz language sql as $$
  select now() - interval '20 minutes' + n * interval '1 minute' $$;

select tests.create_user('anaa') as a \gset
select tests.create_user('boba') as b \gset
select tests.create_user('cyra') as c \gset
select tests.create_user('dina') as d \gset
select tests.create_user('eddy') as e \gset
select tests.create_user('blocked') as x \gset
select tests.create_user('shy') as shy \gset
update profiles set onboarded_at = now();
update profiles set leaderboards_opt_in = false where id = :'shy';
select tests.make_friends(:'a', u) from unnest(array[:'b', :'c', :'d', :'e', :'x', :'shy']::uuid[]) u;
select tests.make_block(:'a', :'x');

delete from visits; delete from places;
create temp table p (n int, id uuid);
insert into p select g, tests.make_place('Spot ' || g) from generate_series(1, 14) g;
grant select on p to authenticated;
update places set type = 'street_stall' where id in (select id from p where n <= 10);

-- Ana: 3 new places this month, plus a repeat of place 1 (no extra point).
insert into visits (user_id, place_id, verdict, visibility, logged_at)
select :'a', id, 'go', 'friends', tests.tick(n) from p where n <= 3;
insert into visits (user_id, place_id, verdict, visibility, logged_at)
select :'a', id, 'go', 'friends', tests.tick(10) from p where n = 1;
-- Bo: 2 places; Cy: 1 shared + 1 private; Di: 4 places; Ed: one backdated place (2 months ago).
insert into visits (user_id, place_id, verdict, visibility, logged_at)
select :'b', id, 'go', 'public', tests.tick(n) from p where n between 4 and 5;
insert into visits (user_id, place_id, verdict, visibility, logged_at) values
  (:'c', (select id from p where n = 6), 'go', 'friends', tests.tick(1)),
  (:'c', (select id from p where n = 7), 'go', 'private', tests.tick(2));
insert into visits (user_id, place_id, verdict, visibility, logged_at)
select :'d', id, 'skip', 'friends', tests.tick(n) from p where n between 8 and 11;
insert into visits (user_id, place_id, verdict, visibility, visited_on)
values (:'e', (select id from p where n = 12), 'go', 'public',
        ((now() at time zone 'Asia/Kolkata')::date - 60));
insert into visits (user_id, place_id, verdict, visibility) select :'x', id, 'go', 'public' from p where n <= 9;
-- Spread over separate days: the daily cap (5 new places per day) applies to badges too.
insert into visits (user_id, place_id, verdict, visibility, visited_on)
select :'shy', id, 'go', 'public', ((now() at time zone 'Asia/Kolkata')::date - n) from p where n <= 9;

-- Friends board ---------------------------------------------------------------------------
select tests.authenticate_as(:'a');
select results_eq($$ select username, score from get_leaderboard('friends', null, 'month') order by rank, username $$,
  $$ values ('dina', 4), ('anaa', 3), ('boba', 2), ('cyra', 1), ('eddy', 0) $$,
  'month board: repeats add nothing, private visits and backdated visits do not count');
select is((select ahead_by from get_leaderboard('friends', null, 'month') where is_me), 2,
  'delta to the person above: 2 more places to pass Di');
select is((select count(*)::int from get_leaderboard('friends', null, 'month') where username = 'blocked'), 0,
  'blocked people never appear');
select is((select count(*)::int from get_leaderboard('friends', null, 'month') where username = 'shy'), 0,
  'people who opted out never appear');
select is((select score from get_leaderboard('friends', null, 'all') where username = 'eddy'), 1,
  'backdated visits count toward all-time');
select throws_ok($$ select * from get_leaderboard('everyone') $$, 'P0001', 'invalid_input',
  'there is no Mumbai-wide or global board');

select tests.authenticate_as(:'c');
select is((select all_time from get_my_progress()), 2, 'your own score includes private visits');
select is((select score from get_leaderboard('friends', null, 'all') where is_me), 1,
  'boards only count shared visits, even for yourself');

-- Group board (5 members, owner opt-in) ----------------------------------------------------
select tests.authenticate_as(:'a');
select create_group('Lunch club', 'friends') as g \gset
select add_group_member(:'g', u) from unnest(array[:'b', :'c', :'d', :'e']::uuid[]) u;
select create_group('Family', 'family') as fam \gset
select throws_ok(format($$select * from get_leaderboard('group', %L)$$, :'g'), 'P0001', 'not_found',
  'group boards are off until the owner turns them on');
select tests.authenticate_as(:'b');
select throws_ok(format('select set_group_leaderboard(%L, true)', :'g'), 'P0001', 'not_found',
  'only the owner can turn a group board on');
select tests.authenticate_as(:'a');
select lives_ok(format('select set_group_leaderboard(%L, true)', :'g'), 'owner turns the board on');
select is((select count(*)::int from get_leaderboard('group', :'g', 'month')), 5, 'a 5-person group board');
select is((select leaderboard_enabled from groups where id = :'fam'), false, 'family groups stay off by default');
select tests.authenticate_as(:'shy');
select throws_ok(format($$select * from get_leaderboard('group', %L)$$, :'g'), 'P0001', 'not_found',
  'non-members cannot see a group board');

-- Badges ---------------------------------------------------------------------------------
reset role;
select is((select count(*)::int from user_badges ub join badges b on b.id = ub.badge_id
           where ub.user_id = :'shy' and b.slug = 'thela-hunter'), 0, 'thela hunter needs 10 stalls (9 so far)');
insert into visits (user_id, place_id, verdict, visibility, visited_on)
select :'shy', id, 'go', 'public', ((now() at time zone 'Asia/Kolkata')::date - 10) from p where n = 10;
select is((select count(*)::int from user_badges ub join badges b on b.id = ub.badge_id
           where ub.user_id = :'shy' and b.slug = 'thela-hunter'), 1, '10th street stall earns Thela Hunter');
-- First Finder: Ana was first at places 1-3; three friends log them later.
insert into visits (user_id, place_id, verdict, visibility)
select :'b', id, 'go', 'friends' from p where n between 1 and 3;
select is((select count(*)::int from user_badges ub join badges b on b.id = ub.badge_id
           where ub.user_id = :'a' and b.slug = 'first-finder'), 1,
  'first in the circle at 3 places that friends visited later: First Finder');
select tests.authenticate_as(:'b');
select ok((select count(*) from get_user_badges(:'a') where slug = 'first-finder') = 1, 'friends can see your badges');
select is((select name from get_badges_for_users(array[:'a'::uuid]) limit 1), 'First Finder',
  'verdict cards get up to 2 badges per author');

-- Feedback ------------------------------------------------------------------------------
select tests.authenticate_as(:'a');
select is((select reason from get_visit_feedback(
  (select id from visits where user_id = :'a' order by logged_at desc limit 1))), 'repeat',
  'feedback explains a repeat visit');
select is((select reason from get_visit_feedback(
  (select id from visits where user_id = :'a' order by logged_at asc limit 1))), 'new_place',
  'feedback for a new place');

-- Verified visits -------------------------------------------------------------------------
reset role;
insert into visits (user_id, place_id, verdict, visibility)
values (:'a', (select id from p where n = 13), 'go', 'friends') returning id as fresh \gset
select tests.authenticate_as(:'a');
select is(verify_visit(:'fresh', 19.0596, 72.8347), true, 'within 150 m of the place: verified');
select is(verify_visit(:'fresh', 19.1000, 72.9000), false, 'far away: not verified');

select * from finish();
rollback;
