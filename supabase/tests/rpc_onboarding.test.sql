-- P1-01 onboarding RPCs.
begin;
\ir _helpers.psql

select plan(10);

select tests.create_user('alice') as alice \gset
select tests.create_user('bob') as bob \gset
insert into areas (id, slug, name, kind) values
  ('44444444-4444-4444-4444-444444444444', 'test-area', 'Test Area', 'suburb'),
  ('55555555-5555-5555-5555-555555555555', 'test-region', 'Test Region', 'region');

select tests.authenticate_as(:'bob');
select is(username_available('alice'), false, 'taken username is unavailable');
select is(username_available('bob'), true, 'your own username counts as available');
select is(username_available('Ab'), false, 'invalid format is unavailable');
select is(username_available('admin'), false, 'reserved names are unavailable');
select is(username_available('user_abc'), false, 'the placeholder user_ prefix is reserved');

select lives_ok($$ select complete_onboarding('bob.eats', 'Bob', '44444444-4444-4444-4444-444444444444',
                                             array['veg','jain'], false, 'followers') $$,
  'valid onboarding succeeds');
select ok((select onboarded_at is not null and username = 'bob.eats' and diet_prefs = array['veg','jain']
           from profiles where id = auth.uid()), 'onboarding saves fields and sets onboarded_at');

select throws_ok($$ select complete_onboarding('alice', 'Bob', null, '{}', false, 'followers') $$,
  'P0001', 'username_taken', 'cannot take someone else''s username');
select throws_ok($$ select complete_onboarding('bob.eats', 'Bob', '55555555-5555-5555-5555-555555555555', '{}', false, 'followers') $$,
  'P0001', 'invalid_input', 'a region is not a valid home area');
select throws_ok($$ select complete_onboarding('bob.eats', 'Bob', null, '{}', true, 'public') $$,
  'P0001', 'invalid_input', 'private accounts cannot default to public entries');

select * from finish();
rollback;
