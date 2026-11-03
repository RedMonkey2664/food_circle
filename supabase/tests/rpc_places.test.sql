-- Place triggers and functions: normalization, area resolution, search, duplicate candidates.
begin;
\ir _helpers.psql

select plan(11);

select is(normalize_name('Kyani & Co.'), 'kyani and co', 'normalize_name lowercases, expands &, strips punctuation');
select is(normalize_name('  Britannia   &   Co. '), 'britannia and co', 'normalize_name collapses whitespace');

-- Start from an empty places/areas set so seeded OSM data cannot affect results (rolled back).
delete from visits;
delete from places;
update profiles set home_area_id = null;  -- rolled back; lets the dev data go
delete from areas;

insert into areas (slug, name, kind, centroid) values
  ('bandra-west', 'Bandra West', 'suburb', st_setsrid(st_makepoint(72.8347, 19.0596), 4326)),
  ('colaba', 'Colaba', 'suburb', st_setsrid(st_makepoint(72.8258, 18.9067), 4326));

insert into places (name, aliases, geom, source) values
  ('Candies', array['Candies Bandra'], st_setsrid(st_makepoint(72.8265, 19.0560), 4326)::geography, 'osm'),
  ('Cafe Mondegar', '{}', st_setsrid(st_makepoint(72.8318, 18.9254), 4326)::geography, 'osm'),
  ('Middle of Nowhere Dhaba', '{}', st_setsrid(st_makepoint(73.5, 19.9), 4326)::geography, 'osm');

select is((select a.slug from places p join areas a on a.id = p.area_id where p.name = 'Candies'), 'bandra-west',
  'area resolves to the nearest centroid within 3 km');
select is((select area_id from places where name = 'Middle of Nowhere Dhaba'), null,
  'points far from every area stay unassigned');
select is((select search_text from places where name = 'Candies'), 'candies candies bandra',
  'search_text includes normalized aliases');

-- a neighbourhood centroid closer than the suburb centroid must not win
insert into areas (slug, name, kind, centroid) values
  ('pali-village', 'Pali Village', 'neighbourhood', st_setsrid(st_makepoint(72.8262, 19.0662), 4326));
insert into places (name, geom, source) values
  ('Pali Cafe', st_setsrid(st_makepoint(72.8263, 19.0663), 4326)::geography, 'osm');
select is((select a.slug from places p join areas a on a.id = p.area_id where p.name = 'Pali Cafe'), 'bandra-west',
  'area resolution prefers the nearest suburb over a closer neighbourhood');

select tests.create_user('searcher') as searcher \gset
select tests.authenticate_as(:'searcher');

select is((select name from search_places('mondegar') limit 1), 'Cafe Mondegar', 'search finds a partial name');
select is((select name from search_places('candis') limit 1), 'Candies', 'search tolerates a typo');
select is((select count(*)::int from search_places('c')), 0, 'one-character queries return nothing');
select is((select name from find_place_candidates('Candies Cafe', 19.0561, 72.8266) limit 1), 'Candies',
  'a near-identical pin is offered as a duplicate candidate');
select is((select count(*)::int from find_place_candidates('Totally Different Thela', 19.0561, 72.8266)), 0,
  'a different name at the same spot is not a candidate');

select * from finish();
rollback;
