-- profiles: visibility under blocks, own-row updates, privileged columns locked.
begin;
\ir _helpers.psql

select plan(11);

select tests.create_user('alice') as alice \gset
select tests.create_user('bob') as bob \gset
select tests.create_user('carol') as carol \gset
select tests.make_block(:'alice', :'carol');

-- signup trigger
select is((select display_name from profiles where id = :'alice'), 'Alice', 'signup trigger copies the Google name');

select tests.authenticate_as(:'bob');
select is((select count(*)::int from profiles where id in (:'alice', :'bob', :'carol')), 3,
  'a user sees other unblocked profiles');

select tests.authenticate_as(:'alice');
select is((select count(*)::int from profiles where id = :'carol'), 0, 'blocker cannot see the blocked profile');
select tests.authenticate_as(:'carol');
select is((select count(*)::int from profiles where id = :'alice'), 0, 'blocked user cannot see the blocker profile');

-- own updates
select tests.authenticate_as(:'bob');
update profiles set bio = 'Vada pav maximalist' where id = :'bob';
select is((select bio from profiles where id = :'bob'), 'Vada pav maximalist', 'user can update own bio');

update profiles set bio = 'hacked' where id = :'alice';
reset role;
select is((select bio from profiles where id = :'alice'), null, 'user cannot update another profile');

-- privileged columns
select tests.authenticate_as(:'bob');
select throws_ok(format('update profiles set is_admin = true where id = %L', :'bob'),
  '42501', null, 'user cannot make themself admin');
select throws_ok(format('update profiles set banned_at = null where id = %L', :'bob'),
  '42501', null, 'user cannot touch banned_at');
select throws_ok(format('update profiles set onboarded_at = now() where id = %L', :'bob'),
  '42501', null, 'user cannot set onboarded_at directly');
select throws_ok(format('insert into profiles (id, username, display_name) values (gen_random_uuid(), %L, %L)', 'mallory', 'M'),
  '42501', null, 'user cannot insert profiles');

-- banned users cannot write
reset role;
update profiles set banned_at = now() where id = :'bob';
select tests.authenticate_as(:'bob');
select throws_ok(format('update profiles set bio = %L where id = %L', 'x', :'bob'),
  '42501', null, 'banned user cannot update their profile');

select * from finish();
rollback;
