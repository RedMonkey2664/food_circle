-- Phase 4: review layer follows the visit; atomic save; photo/dish guards; storage folders;
-- top dishes stay per tier.
begin;
\ir _helpers.psql

select plan(21);

select tests.create_user('author') as author \gset
select tests.create_user('pal') as pal \gset
select tests.create_user('stranger') as stranger \gset
select tests.create_user('fan') as fan \gset
select tests.make_friends(:'author', :'pal');
select tests.make_place('Bun Maska House') as place \gset

insert into visits (user_id, place_id, verdict, visibility) values (:'author', :'place', 'go', 'friends')
returning id as fv \gset
insert into visits (user_id, place_id, verdict, visibility) values (:'stranger', :'place', 'go', 'public')
returning id as sv \gset
insert into visits (user_id, place_id, verdict, visibility) values (:'fan', :'place', 'skip', 'public')
returning id as fanv \gset

-- Save ---------------------------------------------------------------------------------
select tests.authenticate_as(:'author');
select lives_ok(format($$select save_review(%L, 'Chai was perfect', 250, array['family_dinner'],
  '[{"name":"  Bun   Maska ","verdict":"go"},{"name":"Kheema","verdict":"skip"}]')$$, :'fv'),
  'author saves note, price, occasions and dishes in one call');
select is((select name || '|' || name_normalized from review_dishes where visit_id = :'fv' and verdict = 'go'),
  'Bun Maska|bun maska', 'dish names are tidied and normalized by the database');
select lives_ok(format($$select save_review(%L, 'Edited', 300, '{}', '[{"name":"Kheema","verdict":"go"}]')$$, :'fv'),
  'saving again edits the review');
select is((select count(*)::int from review_dishes where visit_id = :'fv'), 1, 'dishes are replaced, not duplicated');
select throws_ok(format($$select save_review(%L, 'x', 1, array['brunch'], '[]')$$, :'fv'), '23514', null,
  'unknown occasion tags are rejected');

select tests.authenticate_as(:'pal');
select throws_ok(format($$select save_review(%L, 'hack', 1, '{}', '[]')$$, :'fv'), 'P0001', 'not_found',
  'nobody else can write the review');

-- Read follows the visit ----------------------------------------------------------------
select is((select note from get_visit_details(array[:'fv'::uuid])), 'Edited', 'a friend sees a Friends review');
select tests.authenticate_as(:'stranger');
select is((select count(*)::int from get_visit_details(array[:'fv'::uuid])), 0, 'a stranger sees nothing of it');
select is((select count(*)::int from review_dishes where visit_id = :'fv'), 0, 'not even its dishes');

-- Photos ---------------------------------------------------------------------------------
select tests.authenticate_as(:'author');
select throws_ok(format($$insert into visit_photos (visit_id, kind, storage_path) values (%L, 'review', %L)$$,
  :'fv', :'stranger' || '/' || :'fv' || '/00000000-0000-0000-0000-000000000000.webp'), 'P0001', 'invalid_input',
  'photo paths must be in the author''s own folder');
select lives_ok(format($$insert into visit_photos (visit_id, kind, storage_path)
  select %L, 'review', %L || '/' || %L || '/' || gen_random_uuid() || '.webp' from generate_series(1, 6)$$,
  :'fv', :'author', :'fv'), 'six photos are fine');
select throws_ok(format($$insert into visit_photos (visit_id, kind, storage_path) values (%L, 'review', %L)$$,
  :'fv', :'author' || '/' || :'fv' || '/' || gen_random_uuid() || '.webp'), 'P0001', 'invalid_input',
  'a seventh photo is rejected');
select is((select cardinality(photo_paths) from get_visit_details(array[:'fv'::uuid])), 6, 'details list the photos');

-- Storage folders --------------------------------------------------------------------------
select lives_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('review-photos', %L, %L)$$,
  :'author' || '/' || :'fv' || '/a.webp', :'author'), 'upload into your own visit folder');
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('review-photos', %L, %L)$$,
  :'pal' || '/' || :'fv' || '/b.webp', :'author'), '42501', null, 'cannot upload into someone else''s folder');
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('review-photos', %L, %L)$$,
  :'author' || '/' || :'sv' || '/c.webp', :'author'), '42501', null, 'cannot upload for a visit that isn''t yours');

-- Reading photo objects follows the visit (signed URLs are created with the viewer's session).
select storage_path as photo from visit_photos where visit_id = :'fv' order by created_at limit 1 \gset
select lives_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('review-photos', %L, %L)$$,
  :'photo', :'author'), 'upload the object behind a photo row');
select tests.authenticate_as(:'pal');
select is((select count(*)::int from storage.objects where name = :'photo'), 1,
  'a friend who can see the visit can read its photo');
select tests.authenticate_as(:'stranger');
select is((select count(*)::int from storage.objects where bucket_id = 'review-photos'), 0,
  'a stranger can read none of these photos');

-- Top dishes stay per tier ------------------------------------------------------------------
reset role;
insert into review_dishes (visit_id, name, name_normalized, verdict) values
  (:'sv', 'Kheema', '', 'skip'), (:'fanv', 'Kheema', '', 'skip');
select tests.authenticate_as(:'pal');
select results_eq($$ select tier::int, name, go_count, skip_count from get_place_top_dishes($$ || quote_literal(:'place') || $$) $$,
  $$ values (1, 'Kheema', 1, 0), (3, 'Kheema', 0, 2) $$,
  'friends and everyone are counted separately, never blended');
select tests.authenticate_as(:'stranger');
select is((select count(*)::int from get_place_top_dishes(:'place') where tier = 1), 0,
  'dishes from visits you cannot see never count');

select * from finish();
rollback;
