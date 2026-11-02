-- Every public table has RLS on; anonymous users get nothing; helpers are not exposed.
begin;
\ir _helpers.psql

select plan(7);

select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'every table in public has row level security enabled');

select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'),
  0,
  'anon has no table privileges in public');

select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'authenticated'
      and privilege_type in ('TRUNCATE','REFERENCES','TRIGGER')),
  0,
  'authenticated has no truncate/references/trigger privileges');

select ok(
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public'
                and p.proname in ('are_friends','is_following','is_blocked_between','can_view_visit',
                                  'relationship_tier','is_admin','is_group_member','resolve_area')),
  'security helpers are not in the API-exposed public schema');

select ok(
  not has_function_privilege('anon', 'public.search_places(text, double precision, double precision, integer)', 'execute'),
  'anon cannot call search_places');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prokind = 'f'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')  -- skip extension functions
      and has_function_privilege('anon', p.oid, 'execute')),
  0,
  'no public or private function is executable by anon');

select ok(
  not has_function_privilege('authenticated', 'public.admin_refresh_place_areas()', 'execute'),
  'maintenance RPCs are service-role only');

select * from finish();
rollback;
