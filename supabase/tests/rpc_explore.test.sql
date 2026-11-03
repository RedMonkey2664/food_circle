-- Explore layer: places in view I haven't been to or saved, with type and pure-veg filters.
begin;
\ir _helpers.psql

select plan(7);

select tests.create_user('explorer') as me \gset
delete from visits; delete from want_to_go; delete from places;

insert into places (name, geom, type, diet_flags, source, status) values
  ('Visited Cafe',  st_setsrid(st_makepoint(72.835, 19.060), 4326)::geography, 'cafe', '{}', 'osm', 'confirmed'),
  ('Saved Cafe',    st_setsrid(st_makepoint(72.836, 19.061), 4326)::geography, 'cafe', '{}', 'osm', 'confirmed'),
  ('New Cafe',      st_setsrid(st_makepoint(72.837, 19.062), 4326)::geography, 'cafe', '{}', 'osm', 'confirmed'),
  ('Veg Cafe',      st_setsrid(st_makepoint(72.838, 19.063), 4326)::geography, 'cafe', '{pure_veg}', 'osm', 'confirmed'),
  ('New Bar',       st_setsrid(st_makepoint(72.839, 19.064), 4326)::geography, 'bar', '{}', 'osm', 'confirmed'),
  ('Closed Cafe',   st_setsrid(st_makepoint(72.840, 19.065), 4326)::geography, 'cafe', '{}', 'osm', 'closed'),
  ('Far Away Cafe', st_setsrid(st_makepoint(72.950, 19.200), 4326)::geography, 'cafe', '{}', 'osm', 'confirmed');
insert into visits (user_id, place_id, verdict, visibility)
select :'me', id, 'go', 'private' from places where name = 'Visited Cafe';
insert into want_to_go (user_id, place_id) select :'me', id from places where name = 'Saved Cafe';

select tests.authenticate_as(:'me');
select is((select array_agg(name order by name) from get_places_in_view(19.05, 72.83, 19.07, 72.85)),
  array['New Bar','New Cafe','Veg Cafe'],
  'shows places in view that I have not been to, saved, or that are closed');
select is((select array_agg(name order by name) from get_places_in_view(19.05, 72.83, 19.07, 72.85, '{cafe}')),
  array['New Cafe','Veg Cafe'], 'type filter');
select is((select array_agg(name) from get_places_in_view(19.05, 72.83, 19.07, 72.85, '{cafe}', true)),
  array['Veg Cafe'], 'pure veg filter');
select is((select count(*)::int from get_places_in_view(19.05, 72.83, 19.07, 72.85) where name = 'Far Away Cafe'), 0,
  'places outside the view are not returned');
select is((select count(*)::int from get_places_in_view(18.9, 72.7, 19.3, 73.0)), 0,
  'a whole-city box is refused (zoom in instead)');
select is((select count(*)::int from get_places_in_view(19.05, 72.83, 19.07, 72.85, null, false, 1)), 1, 'limit is honoured');

select tests.authenticate_anon();
select throws_ok($$ select * from get_places_in_view(19.05, 72.83, 19.07, 72.85) $$, '42501', null,
  'signed-out visitors cannot call it');

select * from finish();
rollback;
