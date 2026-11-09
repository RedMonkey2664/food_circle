-- Google Takeout import matching: nearby similar names match, far or different names do not,
-- already-visited places are flagged, signed-in only, size-limited.
begin;
\ir _helpers.psql

select plan(6);

select tests.create_user('importer') as me \gset
update profiles set onboarded_at = now();
delete from visits; delete from places;
insert into places (name, geom, source, status, type) values
  ('Leopold Cafe', st_setsrid(st_makepoint(72.8323, 18.9227), 4326)::geography, 'user', 'confirmed', 'restaurant'),
  ('Kyani and Co', st_setsrid(st_makepoint(72.8300, 18.9440), 4326)::geography, 'user', 'confirmed', 'cafe');
insert into visits (user_id, place_id, verdict, visibility)
select :'me'::uuid, id, 'go'::verdict, 'private'::visibility from places where name = 'Kyani and Co';

select tests.authenticate_as(:'me');
create temp table m as select * from match_import_places($$[
  {"name":"Leopold Cafe & Bar","lat":18.9228,"lng":72.8324},
  {"name":"Kyani & Co.","lat":18.9441,"lng":72.8301},
  {"name":"Leopold Cafe","lat":19.20,"lng":72.95},
  {"name":"Totally Different","lat":18.9227,"lng":72.8323}
]$$::jsonb);

select is((select place_name from m where idx = 0), 'Leopold Cafe', 'a nearby similar name matches');
select is((select visited from m where idx = 1), true, 'places I already logged are flagged');
select ok(not exists(select 1 from m where idx = 2), 'the same name far away does not match');
select ok(not exists(select 1 from m where idx = 3), 'a different name at the same spot does not match');
select throws_ok($$ select * from match_import_places((select jsonb_agg(jsonb_build_object('name','x','lat',1,'lng',1)) from generate_series(1, 301))) $$,
  'P0001', 'invalid_input', 'at most 300 entries per call');

select tests.authenticate_anon();
select throws_ok($$ select * from match_import_places('[]'::jsonb) $$, '42501', null, 'signed-out visitors cannot call it');

select * from finish();
rollback;
