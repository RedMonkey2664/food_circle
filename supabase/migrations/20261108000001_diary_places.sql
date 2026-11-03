-- Phase 5: pin-drop, diary, logbook (PHASES.md P5-01..P5-11, PLACES_DATA.md sections 6-7).
set search_path = public, extensions;

-- ---------------------------------------------------------------------------------------
-- P5-01, P5-02: add a place with duplicate check
-- ---------------------------------------------------------------------------------------

-- Returns ('candidates', null, [...]) without creating anything when similar places exist
-- nearby and p_force is false; otherwise ('created', id, []). Daily cap 20 per person.
create or replace function public.create_place(
  p_name text, p_lat double precision, p_lng double precision,
  p_type place_type default 'street_stall', p_diet_flags text[] default '{}',
  p_cuisine_tags text[] default '{}', p_force boolean default false)
returns table (status text, place_id uuid, candidates jsonb)
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user(); n text := btrim(coalesce(p_name, '')); cands jsonb; pid uuid;
begin
  if char_length(n) not between 2 and 120 then raise exception 'invalid_input' using errcode = 'P0001', detail = 'name'; end if;
  -- Mumbai region only (generous box around MMR); rejects far-away or swapped coordinates.
  if p_lat is null or p_lng is null or p_lat not between 18.85 and 19.50 or p_lng not between 72.70 and 73.25 then
    raise exception 'invalid_input' using errcode = 'P0001', detail = 'location';
  end if;
  if not (coalesce(p_diet_flags, '{}') <@ array['pure_veg','veg_options','jain','halal','egg'])
     or cardinality(coalesce(p_cuisine_tags, '{}')) > 8 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if (select count(*) from public.places
       where created_by = uid and created_at >= private.ist_day_start()) >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if not coalesce(p_force, false) then
    select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'area_name', c.area_name,
             'distance_m', round(c.distance_m::numeric), 'status', c.status)), '[]'::jsonb)
      into cands
      from public.find_place_candidates(n, p_lat, p_lng, 50) c;
    if jsonb_array_length(cands) > 0 then
      return query select 'candidates'::text, null::uuid, cands;
      return;
    end if;
  end if;

  insert into public.places (name, geom, type, diet_flags, cuisine_tags, source, status, created_by)
  values (n, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_type,
          coalesce(p_diet_flags, '{}'),
          array(select distinct lower(regexp_replace(btrim(t), '[^a-zA-Z0-9]+', '_', 'g'))
                  from unnest(coalesce(p_cuisine_tags, '{}')) t where btrim(t) <> ''),
          'user', 'unverified', uid)
  returning id into pid;
  return query select 'created'::text, pid, '[]'::jsonb;
end $$;

-- ---------------------------------------------------------------------------------------
-- P5-03: unverified -> confirmed after two different people log it
-- ---------------------------------------------------------------------------------------
create or replace function private.confirm_place_if_two_users() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  update public.places p set status = 'confirmed'
   where p.id = new.place_id and p.status = 'unverified'
     and (select count(distinct v.user_id) from public.visits v where v.place_id = new.place_id) >= 2;
  return null;
end $$;

create trigger confirm_place_if_two_users after insert on public.visits
  for each row execute function private.confirm_place_if_two_users();

-- ---------------------------------------------------------------------------------------
-- P5-04: admin merge (PLACES_DATA.md section 7)
-- ---------------------------------------------------------------------------------------
create or replace function public.merge_places(p_source uuid, p_target uuid)
returns table (moved_visits int, affected_users int)
language plpgsql security definer set search_path = public, extensions as $$
declare u uuid; moved int; users uuid[];
begin
  if not private.is_admin() then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if p_source is null or p_target is null or p_source = p_target then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if (select count(*) from public.places where id in (p_source, p_target) and status <> 'merged') <> 2 then
    raise exception 'invalid_input' using errcode = 'P0001', detail = 'missing or already merged';
  end if;

  select coalesce(array_agg(distinct user_id), '{}') into users from public.visits where place_id = p_source;
  perform set_config('app.skip_recompute', 'on', true);
  update public.visits set place_id = p_target where place_id = p_source;
  get diagnostics moved = row_count;
  update public.want_to_go w set place_id = p_target
   where w.place_id = p_source
     and not exists (select 1 from public.want_to_go x where x.user_id = w.user_id and x.place_id = p_target);
  delete from public.want_to_go where place_id = p_source;

  update public.places t
     set aliases = (select coalesce(array_agg(distinct x), '{}') from unnest(t.aliases || s.aliases || array[s.name]) x
                     where x is not null and x <> t.name),
         status = case when t.status = 'unverified' then 'confirmed'::place_status else t.status end
    from public.places s
   where t.id = p_target and s.id = p_source;
  update public.places set status = 'merged', merged_into = p_target where id = p_source;

  insert into public.admin_audit (admin_id, action, target, details)
  values (auth.uid(), 'merge_places', p_target::text,
          jsonb_build_object('source', p_source, 'moved_visits', moved));

  perform set_config('app.skip_recompute', 'off', true);
  foreach u in array users loop
    perform private.recompute_visit_flags(u);
  end loop;
  for u in select distinct user_id from public.visits where place_id = p_target and not (user_id = any (users)) loop
    perform private.recompute_visit_flags(u);
  end loop;
  return query select moved, cardinality(users);
end $$;

-- ---------------------------------------------------------------------------------------
-- P5-05: report closed/moved, suggest fixes; admin applies or dismisses
-- ---------------------------------------------------------------------------------------
create or replace function public.suggest_place_fix(p_place uuid, p_field text, p_value jsonb)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  if p_field not in ('diet_flags','cuisine_tags','type','closed','moved','name') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.places where id = p_place and status <> 'merged') then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if (select count(*) from public.place_suggestions
       where user_id = uid and created_at >= private.ist_day_start()) >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.place_suggestions (place_id, user_id, field, value)
  values (p_place, uid, p_field, coalesce(p_value, 'true'::jsonb));
end $$;

create or replace function public.admin_resolve_place_suggestion(p_id uuid, p_apply boolean)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare s public.place_suggestions%rowtype;
begin
  if not private.is_admin() then raise exception 'forbidden' using errcode = 'P0001'; end if;
  select * into s from public.place_suggestions where id = p_id and status = 'open' for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if p_apply then
    case s.field
      when 'closed' then update public.places set status = 'closed' where id = s.place_id and status <> 'merged';
      when 'name' then update public.places set name = left(btrim(s.value #>> '{}'), 120) where id = s.place_id;
      when 'type' then update public.places set type = (s.value #>> '{}')::place_type where id = s.place_id;
      when 'diet_flags' then update public.places
        set diet_flags = array(select jsonb_array_elements_text(s.value)) where id = s.place_id;
      when 'cuisine_tags' then update public.places
        set cuisine_tags = array(select jsonb_array_elements_text(s.value)) where id = s.place_id;
      else null;  -- 'moved': admin edits the location by hand (needs a map); just mark it actioned
    end case;
  end if;
  update public.place_suggestions set status = case when p_apply then 'actioned' else 'dismissed' end::report_status
   where id = p_id;
  insert into public.admin_audit (admin_id, action, target, details)
  values (auth.uid(), case when p_apply then 'apply_suggestion' else 'dismiss_suggestion' end, s.place_id::text,
          jsonb_build_object('suggestion', p_id, 'field', s.field, 'value', s.value));
end $$;

-- ---------------------------------------------------------------------------------------
-- P5-11: Want to go (private list, never scores)
-- ---------------------------------------------------------------------------------------
create table public.want_to_go (
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  from_visit uuid references public.visits(id) on delete set null,   -- "saved from Riya's verdict"
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);
alter table public.want_to_go enable row level security;
create policy wtg_own on public.want_to_go for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and private.is_active_user(auth.uid()));
grant select, delete on public.want_to_go to authenticated;
grant insert (user_id, place_id, from_visit) on public.want_to_go to authenticated;

-- Logging a visit moves the place from Want to go to Been.
create or replace function private.visits_clear_want_to_go() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from public.want_to_go where user_id = new.user_id and place_id = new.place_id;
  return null;
end $$;
create trigger visits_clear_want_to_go after insert on public.visits
  for each row execute function private.visits_clear_want_to_go();

create or replace function private.want_to_go_limit() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if (select count(*) from public.want_to_go where user_id = new.user_id) >= 500 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger want_to_go_limit before insert on public.want_to_go
  for each row execute function private.want_to_go_limit();

-- ---------------------------------------------------------------------------------------
-- P5-06, P5-10: diary map, on this day, logbook (own data only)
-- ---------------------------------------------------------------------------------------

-- Pins for my map: places I've been (latest verdict, visit count) and places I want to go.
create or replace function public.get_my_map()
returns table (place_id uuid, name text, area_name text, lat double precision, lng double precision,
               kind text, verdict verdict, visits int, last_visited date)
language sql stable security definer set search_path = public, extensions as $$
  with mine as (
    select distinct on (v.place_id) v.place_id, v.verdict, v.visited_on,
           count(*) over (partition by v.place_id)::int as n
    from public.visits v where v.user_id = auth.uid()
    order by v.place_id, v.visited_on desc, v.logged_at desc
  )
  select p.id, p.name, a.name, st_y(p.geom::geometry), st_x(p.geom::geometry),
         'been', m.verdict, m.n, m.visited_on
  from mine m join public.places p on p.id = m.place_id left join public.areas a on a.id = p.area_id
  union all
  select p.id, p.name, a.name, st_y(p.geom::geometry), st_x(p.geom::geometry),
         'want', null, 0, null
  from public.want_to_go w join public.places p on p.id = w.place_id left join public.areas a on a.id = p.area_id
  where w.user_id = auth.uid() and p.status <> 'merged';
$$;

-- My visits on today's date (IST) in earlier years.
create or replace function public.get_on_this_day()
returns table (visit_id uuid, place_id uuid, place_name text, verdict verdict, visited_on date, years_ago int)
language sql stable security definer set search_path = public, extensions as $$
  with today as (select (now() at time zone 'Asia/Kolkata')::date as d)
  select v.id, p.id, p.name, v.verdict, v.visited_on,
         (extract(year from t.d) - extract(year from v.visited_on))::int
  from public.visits v join public.places p on p.id = v.place_id cross join today t
  where v.user_id = auth.uid()
    and extract(month from v.visited_on) = extract(month from t.d)
    and extract(day from v.visited_on) = extract(day from t.d)
    and v.visited_on < t.d
  order by v.visited_on desc
  limit 10;
$$;

-- Logbook counts (unique places, the scoring unit's view of the world).
create or replace function public.get_my_logbook()
returns table (kind text, label text, places int)
language sql stable security definer set search_path = public, extensions as $$
  with mine as (
    select distinct v.place_id from public.visits v where v.user_id = auth.uid()
  ), pl as (
    select p.id, coalesce(parent.name, a.name) as region_or_area, a.name as area, p.cuisine_tags
    from mine m join public.places p on p.id = m.place_id
    left join public.areas a on a.id = p.area_id
    left join public.areas parent on parent.id = a.parent_id
  )
  select 'total', 'All places', count(*)::int from pl
  union all
  select 'areas_covered', 'Areas covered', count(distinct area)::int from pl where area is not null
  union all
  (select 'area', area, count(*)::int from pl where area is not null group by area order by 3 desc, 2 limit 12)
  union all
  (select 'cuisine', c, count(*)::int from pl, unnest(pl.cuisine_tags) c group by c order by 3 desc, 2 limit 12);
$$;

-- ---------------------------------------------------------------------------------------
-- P5-08: companion tagging (tagging alone gives no points)
-- ---------------------------------------------------------------------------------------

-- Visits where I'm tagged and haven't answered yet (for the "Add to your log?" prompt).
create or replace function public.get_my_companion_tags()
returns table (visit_id uuid, place_id uuid, place_name text, visited_on date, by_username text,
               by_display_name text)
language sql stable security definer set search_path = public, extensions as $$
  select v.id, p.id, p.name, v.visited_on, pr.username::text, pr.display_name
  from public.visit_companions c
  join public.visits v on v.id = c.visit_id
  join public.places p on p.id = v.place_id
  join public.profiles pr on pr.id = v.user_id
  where c.user_id = auth.uid() and c.status = 'tagged'
    and not private.is_blocked_between(auth.uid(), v.user_id)
  order by v.visited_on desc
  limit 10;
$$;

-- Answer a tag: 'added' (I'll log it myself, via the log sheet) or 'dismissed'.
create or replace function public.respond_companion_tag(p_visit uuid, p_add boolean)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  update public.visit_companions set status = case when p_add then 'added' else 'dismissed' end::companion_status
   where visit_id = p_visit and user_id = uid and status = 'tagged';
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------------------
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
grant execute on function
  public.create_place(text, double precision, double precision, place_type, text[], text[], boolean),
  public.merge_places(uuid, uuid),
  public.suggest_place_fix(uuid, text, jsonb),
  public.admin_resolve_place_suggestion(uuid, boolean),
  public.get_my_map(), public.get_on_this_day(), public.get_my_logbook(),
  public.get_my_companion_tags(), public.respond_companion_tag(uuid, boolean)
  to authenticated;
