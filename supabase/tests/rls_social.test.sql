-- friendships, follows, blocks, mutes: read own rows only; no direct writes (threat 10).
begin;
\ir _helpers.psql

select plan(12);

select tests.create_user('alice') as alice \gset
select tests.create_user('bob') as bob \gset
select tests.create_user('carol') as carol \gset
select tests.make_friends(:'alice', :'bob');
select tests.make_follow(:'carol', :'alice');
select tests.make_block(:'bob', :'carol');

select tests.authenticate_as(:'alice');
select is((select count(*)::int from friendships), 1, 'alice sees her friendship');
select is((select count(*)::int from follows), 1, 'alice sees the follow pointing at her');

select tests.authenticate_as(:'carol');
select is((select count(*)::int from friendships), 0, 'carol cannot see the alice-bob friendship');
select is((select count(*)::int from blocks), 0, 'the blocked user cannot see the block row');

select tests.authenticate_as(:'bob');
select is((select count(*)::int from blocks), 1, 'the blocker sees their own block');

-- direct writes rejected
select tests.authenticate_as(:'carol');
select throws_ok(
  format('insert into friendships (user_low, user_high, requested_by, status, accepted_at) values (least(%1$L::uuid, %2$L::uuid), greatest(%1$L::uuid, %2$L::uuid), %1$L, ''accepted'', now())', :'carol', :'bob'),
  '42501', null, 'direct friendship insert is rejected');
select throws_ok(format('insert into follows (follower_id, following_id) values (%L, %L)', :'carol', :'bob'),
  '42501', null, 'direct follow insert is rejected');
select throws_ok(format('delete from blocks where blocked_id = %L', :'carol'),
  '42501', null, 'blocked user cannot delete the block');
select throws_ok(format('update follows set status = ''accepted'' where follower_id = %L', :'carol'),
  '42501', null, 'direct follow update is rejected');

-- mutes are self-service
select tests.authenticate_as(:'alice');
select lives_ok(format('insert into mutes (muter_id, muted_id) values (%L, %L)', :'alice', :'bob'),
  'user can mute a friend');
select throws_ok(format('insert into mutes (muter_id, muted_id) values (%L, %L)', :'bob', :'alice'),
  '42501', null, 'user cannot create a mute for someone else');
select tests.authenticate_as(:'bob');
select is((select count(*)::int from mutes), 0, 'the muted friend cannot see the mute');

select * from finish();
rollback;
