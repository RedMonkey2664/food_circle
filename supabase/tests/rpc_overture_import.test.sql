-- Overture import: service-role only, dedupes against existing places, idempotent, status by confidence.
-- Also: 2-letter search matches name starts only.
begin;
\ir _helpers.psql

select plan(11);

delete from visits;
delete from places;

-- An existing OSM place at Bandra (19.0596, 72.8347).
insert into places (name, geom, source, osm_id, status)
values ('Kyani and Co', st_setsrid(st_makepoint(72.8347, 19.0596), 4326)::geography, 'osm', 'node/1', 'confirmed');

create temp table batch as select $$[
  {"overture_id":"ov-dup","name":"Kyani & Co.","lat":19.0597,"lng":72.8347,"type":"cafe","confident":true,"cuisine_tags":["irani_cafe"]},
  {"overture_id":"ov-dup2","name":"Kyani & Company","lat":19.0596,"lng":72.8348,"type":"cafe","confident":true},
  {"overture_id":"ov-new","name":"Bao Bao","lat":19.0700,"lng":72.8400,"type":"restaurant","confident":true,"brand_slug":"bao-bao","brand_name":"Bao Bao"},
  {"overture_id":"ov-weak","name":"Basil Kitchen","lat":19.0800,"lng":72.8450,"type":"restaurant","confident":false},
  {"overture_id":"ov-far","name":"Kyani and Co","lat":18.9440,"lng":72.8290,"type":"cafe","confident":true}
]$$::jsonb as rows;
grant select on batch to authenticated;

select tests.authenticate_as(tests.create_user('someone'));
select throws_ok($$ select * from admin_import_overture((select rows from batch)) $$, '42501', null,
  'signed-in users cannot run the import');
reset role;

select results_eq($$ select inserted, linked, skipped from admin_import_overture((select rows from batch)) $$,
  $$ values (3, 1, 1) $$, 'new places inserted, the nearby duplicate linked, the second duplicate skipped');
select is((select overture_id from places where osm_id = 'node/1'), 'ov-dup',
  'existing OSM place gets the Overture id');
select is((select cuisine_tags from places where osm_id = 'node/1'), array['irani_cafe'],
  'empty cuisine tags are filled from Overture');
select is((select count(*)::int from places where name ilike 'kyani%'), 2,
  'same name far away is a separate branch, not a duplicate');
select is((select status::text from places where overture_id = 'ov-weak'), 'unverified',
  'low-confidence places are imported unverified');
select is((select status::text || '/' || source from places where overture_id = 'ov-new'), 'confirmed/overture',
  'confident places are confirmed with source overture');
select ok((select area_id is not null or not exists (select 1 from areas) from places where overture_id = 'ov-new'),
  'area resolved by the places trigger when areas exist');
select results_eq($$ select inserted, linked, skipped from admin_import_overture((select rows from batch)) $$,
  $$ values (0, 0, 5) $$, 'running the same batch again changes nothing');

select tests.authenticate_as(tests.create_user('searcher'));
select is((select array_agg(name order by name) from search_places('ba')), array['Bao Bao','Basil Kitchen'],
  '2-letter search matches the start of names');
select is((select name from search_places('kitch') limit 1), 'Basil Kitchen',
  '3+ letters also match inside names');

select * from finish();
rollback;
