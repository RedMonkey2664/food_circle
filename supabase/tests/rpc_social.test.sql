-- P1-02..P1-05 social graph RPCs (TESTING.md: rpc_invites + social rules).
begin;
\ir _helpers.psql

select plan(32);

select tests.create_user('alice') as alice \gset
select tests.create_user('bob') as bob \gset
select tests.create_user('carol') as carol \gset
select tests.create_user('priv', true) as priv \gset
select tests.create_user('mallory') as mallory \gset

-- Friends ----------------------------------------------------------------------------------
select tests.authenticate_as(:'alice');
select is(request_friend(:'bob'), 'requested', 'alice sends bob a friend request');
select throws_ok(format('select request_friend(%L)', :'bob'), 'P0001', 'request_pending', 'no duplicate request');
select throws_ok(format('select request_friend(%L)', :'alice'), 'P0001', 'invalid_input', 'cannot friend yourself');
select throws_ok(format('select respond_friend(%L, true)', :'bob'), 'P0001', 'not_found',
  'the requester cannot accept their own request');

select tests.authenticate_as(:'bob');
select lives_ok(format('select respond_friend(%L, true)', :'alice'), 'bob accepts');
select ok(private.are_friends(:'alice', :'bob'), 'alice and bob are friends');
select throws_ok(format('select request_friend(%L)', :'alice'), 'P0001', 'already_friends', 'already friends');

-- Crossing requests auto-accept
select tests.authenticate_as(:'carol');
select is(request_friend(:'alice'), 'requested', 'carol requests alice');
select tests.authenticate_as(:'alice');
select is(request_friend(:'carol'), 'accepted', 'alice requesting carol back accepts');

select lives_ok(format('select remove_friend(%L)', :'carol'), 'alice unfriends carol');
select ok(not private.are_friends(:'alice', :'carol'), 'unfriend removes the friendship');

-- Follows ------------------------------------------------------------------------------------
select tests.authenticate_as(:'carol');
select is(follow_user(:'alice'), 'accepted', 'following a public account is immediate');
select is(follow_user(:'priv'), 'pending', 'following a private account needs approval');
select ok(not private.is_following(:'carol', :'priv'), 'pending follow does not count yet');
select tests.authenticate_as(:'priv');
select lives_ok(format('select respond_follow(%L, true)', :'carol'), 'private account approves');
select ok(private.is_following(:'carol', :'priv'), 'approved follow counts');
select lives_ok(format('select remove_follower(%L)', :'carol'), 'private account removes a follower');
select ok(not exists (select 1 from follows where follower_id = :'carol' and following_id = :'priv'),
  'removed follower is gone');

-- Block ----------------------------------------------------------------------------------------
select tests.authenticate_as(:'alice');
select lives_ok(format('select block_user(%L)', :'bob'), 'alice blocks her friend bob');
select ok(not private.are_friends(:'alice', :'bob'), 'block removes the friendship');
select tests.authenticate_as(:'bob');
select throws_ok(format('select request_friend(%L)', :'alice'), 'P0001', 'blocked', 'blocked user cannot re-friend');
select throws_ok(format('select follow_user(%L)', :'alice'), 'P0001', 'blocked', 'blocked user cannot follow');

-- Invites -------------------------------------------------------------------------------------
select tests.authenticate_as(:'alice');
select code as invite_code, id as invite_id from create_invite('friend') \gset
select ok(length(:'invite_code') >= 22, 'invite codes are at least 22 characters');

select tests.authenticate_as(:'mallory');
select is((select status from get_invite_preview(:'invite_code')), 'ok', 'preview says the link is good');
select lives_ok(format('select * from redeem_invite(%L)', :'invite_code'), 'mallory redeems the invite');
select ok(private.are_friends(:'alice', :'mallory'), 'redeeming makes them friends immediately');
select throws_ok(format('select * from redeem_invite(%L)', :'invite_code'), 'P0001', 'already_friends',
  'the same person cannot redeem twice');

select tests.authenticate_as(:'bob');
select throws_ok(format('select * from redeem_invite(%L)', :'invite_code'), 'P0001', 'blocked',
  'a blocked person cannot use the inviter''s link');

select tests.authenticate_as(:'alice');
select lives_ok(format('select revoke_invite(%L)', :'invite_id'), 'alice revokes the link');
select tests.authenticate_as(:'carol');
select throws_ok(format('select * from redeem_invite(%L)', :'invite_code'), 'P0001', 'invite_revoked',
  'revoked links stop working');

-- Expired and used-up links
select tests.authenticate_as(:'alice');
select code as code2, id as id2 from create_invite('friend') \gset
select code as code3, id as id3 from create_invite('friend') \gset
reset role;
update invites set expires_at = now() - interval '1 minute' where id = :'id2';
update invites set uses = max_uses where id = :'id3';
select tests.authenticate_as(:'carol');
select throws_ok(format('select * from redeem_invite(%L)', :'code2'), 'P0001', 'invite_expired',
  'expired links stop working');
select throws_ok(format('select * from redeem_invite(%L)', :'code3'), 'P0001', 'invite_used_up',
  'links stop working after max uses');

select * from finish();
rollback;
