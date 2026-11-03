-- Phase 3 groups: membership rules, roles, invites, audience groups, group tag, group feed.
-- Includes the Phase 3 Done-when: a Family-only verdict is visible to Family members and
-- nobody else, including other friends.
begin;
\ir _helpers.psql

select plan(30);

select tests.create_user('mum') as mum \gset
select tests.create_user('kid') as kid \gset
select tests.create_user('aunty') as aunty \gset
select tests.create_user('collegefriend') as cf \gset
select tests.create_user('stranger') as stranger \gset
select tests.create_user('follower') as fol \gset
update profiles set onboarded_at = now();
select tests.make_friends(:'mum', :'kid');
select tests.make_friends(:'mum', :'aunty');
select tests.make_friends(:'mum', :'cf');
select tests.make_follow(:'fol', :'mum');
select tests.make_place('Family Dhaba') as place \gset

-- Create and roles ---------------------------------------------------------------------
select tests.authenticate_as(:'mum');
select create_group('Family', 'family') as fam \gset
select is((select role::text from get_my_groups() where id = :'fam'), 'owner', 'creator is the owner');
select is((select is_private::text || '/' || leaderboard_enabled::text from groups where id = :'fam'),
  'true/false', 'groups start private with no leaderboard (P3-06)');
select lives_ok(format('select add_group_member(%L, %L)', :'fam', :'kid'), 'owner adds a friend');
select lives_ok(format('select add_group_member(%L, %L)', :'fam', :'aunty'), 'owner adds another friend');
select throws_ok(format('select add_group_member(%L, %L)', :'fam', :'stranger'), 'P0001', 'needs_friendship',
  'owner cannot add a non-friend');
reset role;
select throws_ok(format($$insert into group_members (group_id, user_id) values (%L, %L)$$, :'fam', :'stranger'),
  'P0001', 'needs_friendship', 'the trigger rejects non-friends even on direct inserts');

select tests.authenticate_as(:'kid');
select is((select count(*)::int from get_group_members(:'fam')), 3, 'members see each other');
select throws_ok(format('select remove_group_member(%L, %L)', :'fam', :'aunty'), 'P0001', 'not_found',
  'a member cannot remove someone else');
select throws_ok(format('select delete_group(%L)', :'fam'), 'P0001', 'not_found',
  'a member cannot delete the group');

select tests.authenticate_as(:'cf');
select is((select count(*)::int from get_group_members(:'fam')), 0, 'non-members cannot list members');
select is((select count(*)::int from groups where id = :'fam'), 0, 'non-members cannot see the group');

-- Done-when: Family-only verdict ------------------------------------------------------
select tests.authenticate_as(:'mum');
select log_visit_for_groups(:'place', 'go', array[:'fam'::uuid]) as famvisit \gset
select is((select visibility::text from visits where id = :'famvisit'), 'friends', 'saved as a Friends visit');
select is((select count(*)::int from visit_audience_groups where visit_id = :'famvisit'), 1,
  'shared with Family only, in the same transaction');

select tests.authenticate_as(:'kid');
select is((select count(*)::int from visits where id = :'famvisit'), 1, 'Family member sees it');
select is((select group_name from get_place_verdicts(:'place', 'friends') where visit_id = :'famvisit'), 'Family',
  'verdict carries the Family tag');
select is((select count(*)::int from get_home_feed('group:' || :'fam') where visit_id = :'famvisit'), 1,
  'it shows in the Family feed tab');
select tests.authenticate_as(:'cf');
select is((select count(*)::int from visits where id = :'famvisit'), 0, 'a friend outside Family does not see it');
select is((select count(*)::int from get_place_summary(:'place')), 0, 'nor in place counts');
select is((select count(*)::int from get_home_feed('friends') where visit_id = :'famvisit'), 0, 'nor in the friends feed');
select throws_ok(format($$select * from get_home_feed('group:%s')$$, :'fam'), 'P0001', 'not_found',
  'non-members cannot open the group feed');
select tests.authenticate_as(:'fol');
select is((select count(*)::int from visits where id = :'famvisit'), 0, 'followers do not see it');
select tests.authenticate_as(:'stranger');
select is((select count(*)::int from visits where id = :'famvisit'), 0, 'strangers do not see it');

-- Audience rules ------------------------------------------------------------------------
select tests.authenticate_as(:'cf');
select create_group('College gang') as gang \gset
reset role;
insert into visits (user_id, place_id, verdict, visibility) values (:'mum', :'place', 'skip', 'public')
returning id as pubvisit \gset
select tests.authenticate_as(:'mum');
select throws_ok(format('select set_visit_audience_groups(%L, array[%L]::uuid[])', :'pubvisit', :'fam'),
  'P0001', 'invalid_input', 'audience groups only on Friends visits');
select throws_ok(format('select log_visit_for_groups(%L, %L, array[%L]::uuid[])', :'place', 'go', :'gang'),
  'P0001', 'forbidden', 'cannot share with a group you are not in');

-- Leaving, invites, deleting -------------------------------------------------------------
select tests.authenticate_as(:'aunty');
select lives_ok(format('select remove_group_member(%L, %L)', :'fam', :'aunty'), 'a member can leave');

select tests.authenticate_as(:'mum');
select code as famcode from create_invite('group', :'fam') \gset
select tests.authenticate_as(:'stranger');
select is((select status from get_invite_preview(:'famcode')), 'needs_friendship',
  'preview tells a non-friend they need to be friends first');
select throws_ok(format('select * from redeem_invite(%L)', :'famcode'), 'P0001', 'needs_friendship',
  'a non-friend cannot join without becoming friends');
select lives_ok(format('select * from redeem_invite(%L, true)', :'famcode'),
  'becoming friends through the same link joins the group');
select is((select status from get_invite_preview(:'famcode')), 'already_member', 'now a member');

select tests.authenticate_as(:'mum');
select delete_group(:'fam');
select is((select visibility::text from visits where id = :'famvisit'), 'private',
  'deleting the group makes Family-only visits private, never wider');

select * from finish();
rollback;
