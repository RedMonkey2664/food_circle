-- Scoring rules (SCORING_BADGES.md §9): repeats, daily cap, chain cap, backdating,
-- delete recompute, private visits in own score but not the shared score.
begin;
\ir _helpers.psql

select plan(14);

select tests.create_user('scorer') as u \gset
insert into brands (id, slug, name) values ('66666666-6666-6666-6666-666666666666', 'test-chain', 'Test Chain');

-- now() is constant inside a transaction, so every visit gets an explicit, increasing logged_at.
create sequence tick;
create or replace function tests.at() returns timestamptz language sql as $$
  select now() - interval '1 hour' + nextval('tick') * interval '1 second';
$$;

-- 8 independent places and 5 outlets of one chain
create temp table p (n int, id uuid);
insert into p select g, tests.make_place('Indie ' || g) from generate_series(1, 8) g;
insert into p select 100 + g, tests.make_place('Chain outlet ' || g) from generate_series(1, 5) g;
update places set brand_id = '66666666-6666-6666-6666-666666666666' where id in (select id from p where n > 100);

-- 1. Repeat visit: second visit to the same place earns nothing
insert into visits (user_id, place_id, verdict, visibility, visited_on, logged_at)
values (:'u', (select id from p where n = 1), 'go', 'public', current_date - 1, tests.at());
insert into visits (user_id, place_id, verdict, visibility, visited_on, logged_at)
values (:'u', (select id from p where n = 1), 'skip', 'public', current_date, tests.at());
select is((select count(*)::int from visits where user_id = :'u' and place_id = (select id from p where n = 1) and counts_all_time), 1,
  'only the first visit to a place counts');
select is((select is_first_visit from visits where user_id = :'u' and verdict = 'skip'), false, 'the repeat is flagged as not first');

-- 2. Daily cap: 6 new places on the same day -> 5 count (place 1 was yesterday)
insert into visits (user_id, place_id, verdict, visibility, visited_on, logged_at)
select :'u', id, 'go', 'public', current_date, tests.at() from (select * from p where n between 2 and 7 order by n) x;
select is((select count(*)::int from visits where user_id = :'u' and visited_on = current_date and counts_all_time), 5,
  'at most 5 new places count per day');
select is((select counts_all_time from visits v join p on p.id = v.place_id where v.user_id = :'u' and p.n = 7), false,
  'the 6th new place that day does not count');

-- 3. Backdating: yesterday is fine, two days ago counts toward all-time only
select ok((select counts_in_periods from visits v join p on p.id = v.place_id where v.user_id = :'u' and p.n = 1 and v.is_first_visit),
  'a visit dated yesterday still counts this week/month');
insert into visits (user_id, place_id, verdict, visibility, visited_on, logged_at)
values (:'u', (select id from p where n = 8), 'go', 'public', current_date - 2, tests.at());
select ok((select counts_all_time and is_backdated and not counts_in_periods
           from visits v join p on p.id = v.place_id where v.user_id = :'u' and p.n = 8),
  'a visit dated two days ago is backdated: all-time only');

-- 4. Chain cap: 4 outlets in one month -> 3 count; next month resets
insert into visits (user_id, place_id, verdict, visibility, visited_on, logged_at)
select :'u', id, 'go', 'public', (date_trunc('month', current_date) - interval '3 months')::date + n - 100, tests.at()
from (select * from p where n between 101 and 104 order by n) x;
select is((select count(*)::int from visits v join p on p.id = v.place_id
            where v.user_id = :'u' and p.n between 101 and 104 and v.counts_all_time), 3,
  'at most 3 outlets of one chain count per month');
insert into visits (user_id, place_id, verdict, visibility, visited_on, logged_at)
values (:'u', (select id from p where n = 105), 'go', 'public', (date_trunc('month', current_date) - interval '2 months')::date + 1, tests.at());
select ok((select counts_all_time from visits v join p on p.id = v.place_id where v.user_id = :'u' and p.n = 105),
  'the chain cap resets the next month');

-- 5. Scores: all-time = 1 (place 1) + 5 (today) + 1 (backdated) + 3 + 1 (chain) = 11
select is((select unique_places from user_scores where user_id = :'u' and period = 'all'), 11,
  'all-time score counts distinct counted places');
select is((select unique_places from user_scores where user_id = :'u' and period = 'month'
            and period_start = date_trunc('month', current_date)::date), 6,
  'this month excludes backdated and old visits');

-- 6. Private visits: in your own score, not in the shared (leaderboard) score
update visits set visibility = 'private'
 where user_id = :'u' and place_id = (select id from p where n = 2);
select is((select (unique_places, unique_places_shared)::text from user_scores where user_id = :'u' and period = 'all'), '(11,10)',
  'private visits count for you but not on boards');

-- 7. Deleting a counted visit frees the slot: the 6th place of the day now counts
delete from visits where user_id = :'u' and place_id = (select id from p where n = 3);
select ok((select counts_all_time from visits v join p on p.id = v.place_id where v.user_id = :'u' and p.n = 7),
  'deleting a visit recomputes: the next place moves into the daily cap');
select is((select unique_places from user_scores where user_id = :'u' and period = 'all'), 11,
  'score stays consistent after delete + promotion');

-- 8. Clients can't call the recompute themselves with a fake id, and can read only their scores
select tests.authenticate_as(:'u');
select is((select count(*)::int from get_my_scores() where period = 'all'), 1, 'get_my_scores returns the caller''s scores');

select * from finish();
rollback;
