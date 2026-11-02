-- Phase 1 "Done when" scenario (PHASES.md), steps 1-5, as three real users A, B, C.
-- Kept as a regression test: if this ever fails, the core loop is broken.
begin;
\ir _helpers.psql

select plan(14);

select tests.create_user('user_a_scn') as a \gset
select tests.create_user('user_b_scn') as b \gset
select tests.create_user('user_c_scn') as c \gset
select tests.make_place('Scenario Place P') as p \gset

-- Step 1: A and B become friends via an invite link. C follows A (public account).
select tests.authenticate_as(:'a');
select code as code from create_invite('friend') \gset
select tests.authenticate_as(:'b');
select lives_ok(format('select * from redeem_invite(%L)', :'code'), '1. B opens A''s invite link and taps Add as friend');
select ok(private.are_friends(:'a', :'b'), '1. A and B are friends');
select tests.authenticate_as(:'c');
select is(follow_user(:'a'), 'accepted', '1. C follows A (public account, no approval)');

-- Step 2: A logs Friends visibility, B logs Go/Followers, C logs Skip/Public, all at P.
select tests.authenticate_as(:'a');
insert into visits (user_id, place_id, verdict, visibility) values (:'a', :'p', 'go', 'friends');
select tests.authenticate_as(:'b');
insert into visits (user_id, place_id, verdict, visibility) values (:'b', :'p', 'go', 'followers');
select tests.authenticate_as(:'c');
insert into visits (user_id, place_id, verdict, visibility) values (:'c', :'p', 'skip', 'public');
select pass('2. all three visits logged with only a verdict and visibility');

-- Step 3: B opens P: A tagged FRIEND, C tagged Public; counts per tier, never merged.
select tests.authenticate_as(:'b');
select is((select tier from get_place_verdicts(:'p', 'everyone') where author_id = :'a'), 1::smallint,
  '3. B sees A''s verdict tagged FRIEND');
select is((select tier from get_place_verdicts(:'p', 'everyone') where author_id = :'c'), 3::smallint,
  '3. B sees C''s verdict tagged Public (B does not follow C)');
select results_eq(
  format('select tier, went from get_place_summary(%L) order by tier', :'p'),
  $$ values (0::smallint, 1), (1::smallint, 1), (3::smallint, 1) $$,
  '3. B''s summary: you / friends / everyone counted separately, no blended row');

-- Step 4: C opens P: no A (friends-only); B's followers visit only if C follows B.
select tests.authenticate_as(:'c');
select is((select count(*)::int from get_place_verdicts(:'p', 'everyone') where author_id = :'a'), 0,
  '4. C does not see A''s friends-only verdict');
select is((select count(*)::int from get_place_verdicts(:'p', 'everyone') where author_id = :'b'), 0,
  '4. C does not see B''s followers verdict before following B');
select is(follow_user(:'b'), 'accepted', '4. C follows B');
select is((select tier from get_place_verdicts(:'p', 'everyone') where author_id = :'b'), 2::smallint,
  '4. now C sees B''s verdict tagged Following');

-- Step 5: A blocks C: neither sees the other anywhere.
select tests.authenticate_as(:'a');
select lives_ok(format('select block_user(%L)', :'c'), '5. A blocks C');
select is((select count(*)::int from get_place_verdicts(:'p', 'everyone') where author_id = :'c'), 0,
  '5. A no longer sees C''s verdict');
select tests.authenticate_as(:'c');
select ok((select count(*) from profiles where id = :'a') = 0
          and (select count(*) from get_profile_stats(:'a')) = 0
          and not private.is_following(:'c', :'a'),
  '5. C can''t see A''s profile or stats, and the follow was removed');

select * from finish();
rollback;
