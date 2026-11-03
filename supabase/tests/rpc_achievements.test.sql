-- Achievements (Phase 6, reworked): unlocking, secrets, progress, showcase, privacy, feedback.
-- No leaderboards or comparison exist.
begin;
\ir _helpers.psql

select plan(20);

select tests.create_user('eater') as me \gset
select tests.create_user('pal') as pal \gset
select tests.create_user('blocked') as blk \gset
update profiles set onboarded_at = now();
select tests.make_friends(:'me', :'pal');
select tests.make_block(:'blk', :'me');

delete from visits; delete from places;
create temp table p (n int, id uuid);
insert into p select g, tests.make_place('Cafe ' || g) from generate_series(1, 6) g;
grant select on p to authenticated;
update places set type = 'cafe' where id in (select id from p);

-- Spread over days so the daily cap (5 new places per day) does not hold them back.
insert into visits (user_id, place_id, verdict, visibility, visited_on)
select :'me', id, 'go', 'friends', ((now() at time zone 'Asia/Kolkata')::date - n) from p where n <= 4;

select tests.authenticate_as(:'me');
select is((select progress from get_achievements(:'me') where slug = 'bean-there'), 4,
  'locked achievements show progress (4 of 5 cafes)');
select is((select earned_at from get_achievements(:'me') where slug = 'bean-there'), null,
  'not earned yet');
select is((select name || '|' || icon from get_achievements(:'me') where slug = 'night-owl'), '???|❔',
  'secret achievements are masked until earned');
select is((select progress from get_achievements(:'me') where slug = 'night-owl'), null,
  'and show no progress hint');

reset role;
insert into visits (user_id, place_id, verdict, visibility, visited_on)
select :'me', id, 'go', 'friends', ((now() at time zone 'Asia/Kolkata')::date - 5) from p where n = 5;
select tests.authenticate_as(:'me');
select ok((select earned_at is not null from get_achievements(:'me') where slug = 'bean-there'),
  'fifth cafe unlocks Bean There, Done That');
select is((select reason from get_visit_feedback((select id from visits where user_id = :'me' order by logged_at desc limit 1))),
  'new_place', 'feedback: new place');
select ok((select unlocked @> '[{"name":"Bean There, Done That"}]' from get_visit_feedback(
  (select id from visits where user_id = :'me' order by logged_at desc, id desc limit 1))),
  'feedback lists what this visit just unlocked');

-- Reviews and dishes unlock things too
select lives_ok(format($$select save_review(%L, null, 1800, '{}', '[]')$$,
  (select id from visits where user_id = :'me' order by logged_at limit 1)), 'saving a pricey review');
reset role;
insert into reviews (visit_id, price_per_head)
select v.id, 2000 from visits v where v.user_id = :'me'
  and not exists (select 1 from reviews r where r.visit_id = v.id) order by v.logged_at limit 2;
select tests.authenticate_as(:'me');
select ok((select earned_at is not null from get_achievements(:'me') where slug = 'fine-diner'),
  'three meals at Rs 1,500+ a head: The Fine Diner');

-- Secret: same place five times
reset role;
insert into visits (user_id, place_id, verdict, visibility)
select :'me', (select id from p where n = 6), 'go', 'private' from generate_series(1, 5);
select tests.authenticate_as(:'me');
select is((select name from get_achievements(:'me') where slug = 'same-again-bhaiya'), 'Same Again, Bhaiya',
  'a secret achievement reveals its name once earned');

-- Showcase
select lives_ok($$ select set_showcase(array['fine-diner','bean-there','first-bite']) $$,
  'pin up to three earned badges');
select is((select array_agg(slug order by slot) from get_showcases(array[:'me'::uuid])),
  array['fine-diner','bean-there','first-bite'], 'pinned in the chosen order');
select throws_ok($$ select set_showcase(array['skip-lord']) $$, 'P0001', 'forbidden',
  'cannot pin a badge you have not earned');
select throws_ok($$ select set_showcase(array['first-bite','bean-there','fine-diner','same-again-bhaiya']) $$,
  'P0001', 'invalid_input', 'at most three');
select throws_ok(format($$insert into profile_badges (user_id, badge_id, position)
  select %L, id, 1 from badges where slug = 'skip-lord'$$, :'me'), '42501', null,
  'no direct writes to the showcase');

-- Privacy: others see earned only; blocked people see nothing
select tests.authenticate_as(:'pal');
select is((select count(*)::int from get_achievements(:'me') where earned_at is null), 0,
  'friends see only earned achievements, never your locked progress');
select is((select count(*)::int from get_showcases(array[:'me'::uuid])), 3, 'friends see your showcase');
select tests.authenticate_as(:'blk');
select is((select count(*)::int from get_achievements(:'me')), 0, 'blocked people see nothing');
select is((select count(*)::int from get_showcases(array[:'me'::uuid])), 0, 'not even the showcase');

-- No competition
select is((select count(*)::int from pg_proc where proname in ('get_leaderboard', 'set_group_leaderboard')), 0,
  'no leaderboard functions exist');

select * from finish();
rollback;
