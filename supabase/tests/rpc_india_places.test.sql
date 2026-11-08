-- India expansion: areas per city, attractions never merged into food places, city/category,
-- smallest covering area wins, Wikimedia info/photos readable but never writable by users.
begin;
\ir _helpers.psql

select plan(17);

delete from visits;
delete from places;

-- A Jaipur city box and one neighbourhood inside it.
select is(admin_import_areas($$[
  {"slug":"jaipur","name":"Jaipur","kind":"region","city":"Jaipur",
   "geojson":"{\"type\":\"Polygon\",\"coordinates\":[[[75.70,26.80],[75.90,26.80],[75.90,27.00],[75.70,27.00],[75.70,26.80]]]}"},
  {"slug":"jaipur-amer","name":"Amer, Jaipur","kind":"neighbourhood","city":"Jaipur",
   "geojson":"{\"type\":\"Polygon\",\"coordinates\":[[[75.84,26.97],[75.86,26.97],[75.86,26.99],[75.84,26.99],[75.84,26.97]]]}"}
]$$::jsonb), 2, 'areas for a new city are imported');

-- A cafe and a fort with the same name, side by side.
create temp table batch as select $$[
  {"overture_id":"ov-fort","name":"Amber Fort","lat":26.9855,"lng":75.8513,"type":"attraction","confident":true,"category":"fort","city":"Jaipur"},
  {"overture_id":"ov-cafe","name":"Amber Fort Cafe","lat":26.9856,"lng":75.8514,"type":"cafe","confident":true,"category":"cafe","city":"Jaipur"},
  {"overture_id":"ov-hawa","name":"Hawa Mahal","lat":26.9239,"lng":75.8267,"type":"attraction","confident":true,"category":"palace","city":"Jaipur"}
]$$::jsonb as rows;

select tests.authenticate_as(tests.create_user('tourist'));
select throws_ok($$ select admin_import_areas('[]'::jsonb) $$, '42501', null,
  'signed-in users cannot import areas');
select throws_ok($$ select * from admin_import_wikimedia('[]'::jsonb) $$, '42501', null,
  'signed-in users cannot import Wikimedia data');
reset role;

select results_eq($$ select inserted from admin_import_overture((select rows from batch)) $$,
  $$ values (3) $$, 'a fort and a cafe with similar names stay two places');
select is((select type::text from places where overture_id = 'ov-fort'), 'attraction', 'attractions keep their type');
select is((select category from places where overture_id = 'ov-fort'), 'fort', 'category is stored');
select is((select city from places where overture_id = 'ov-cafe'), 'Jaipur', 'city is stored');
select is((select a.name from places p join areas a on a.id = p.area_id where p.overture_id = 'ov-fort'),
  'Amer, Jaipur', 'the smallest covering area wins (neighbourhood over city)');
select is((select a.name from places p join areas a on a.id = p.area_id where p.overture_id = 'ov-hawa'),
  'Jaipur', 'outside any neighbourhood a place falls back to its city');

-- User-added places get their city from the area.
insert into places (name, geom, source, status)
values ('Tiny Chai Thela', st_setsrid(st_makepoint(75.85, 26.98), 4326)::geography, 'user', 'unverified');
select is((select city from places where name = 'Tiny Chai Thela'), 'Jaipur', 'city follows the area');

-- Wikimedia: matched to the nearby fort, not the cafe.
select results_eq($$ select matched, photos from admin_import_wikimedia($w$[
  {"qid":"Q463359","kind":"other","label":"Amer Fort","lat":26.9854,"lng":75.8512,"description":"fort in Rajasthan, India",
   "wiki_title":"Amber Fort","wiki_url":"https://en.wikipedia.org/wiki/Amber_Fort","extract":"Amer Fort is a fort.",
   "file_title":"Amer Fort.jpg","thumb_url":"https://upload.wikimedia.org/x/800px-Amer_Fort.jpg","width":800,"height":600,
   "author":"A. Photographer","licence":"CC BY-SA 4.0","licence_url":"https://creativecommons.org/licenses/by-sa/4.0",
   "page_url":"https://commons.wikimedia.org/wiki/File:Amer_Fort.jpg"},
  {"qid":"Q999","label":"Somewhere Else","lat":26.50,"lng":75.50,"file_title":"X.jpg",
   "thumb_url":"https://upload.wikimedia.org/x.jpg","page_url":"https://commons.wikimedia.org/wiki/File:X.jpg"}
]$w$::jsonb) $$, $$ values (1, 1) $$, 'an item is matched to the nearby place with a similar name; far items are ignored');
select is((select p.overture_id from place_info i join places p on p.id = i.place_id), 'ov-fort',
  'a landmark matches the attraction, never the cafe next to it');
-- A suburb item must not attach itself to a chain outlet named after the suburb.
insert into places (name, geom, source, status, type)
values ('Starbucks - Amer', st_setsrid(st_makepoint(75.8520, 26.9860), 4326)::geography, 'user', 'confirmed', 'cafe');
select results_eq($$ select matched from admin_import_wikimedia($w$[
  {"qid":"Q1","kind":"other","label":"Amer","lat":26.9860,"lng":75.8520,"file_title":"Amer town.jpg",
   "thumb_url":"https://upload.wikimedia.org/a.jpg","page_url":"https://commons.wikimedia.org/wiki/File:A.jpg"}
]$w$::jsonb) $$, $$ values (0) $$, 'a place-name item never matches a food outlet named after it');

select tests.authenticate_as(tests.create_user('reader'));
select is((select count(*)::int from place_media), 1, 'signed-in users can read photos');
select is((select short_description from place_info), 'fort in Rajasthan, India', 'and descriptions');
select throws_ok($$ insert into place_media (place_id, file_title, thumb_url, page_url)
  select id, 'Mine.jpg', 'https://upload.wikimedia.org/m.jpg', 'https://commons.wikimedia.org/wiki/File:M.jpg' from places limit 1 $$,
  '42501', null, 'but cannot add photos');
select tests.authenticate_anon();
select throws_ok($$ select count(*) from place_info $$, '42501', null, 'anonymous visitors cannot read place info');

select * from finish();
rollback;
