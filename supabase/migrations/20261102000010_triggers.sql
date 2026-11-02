-- 0010 triggers in Phase 0 scope (DATABASE.md §8)
-- Deferred to later phases (new migrations then): visits recompute (P1-09), set_follow_status (P1-04),
-- confirm_place_if_two_users (P5-03), group/audience-group integrity (Phase 3).
set search_path = public, extensions;

-- places: normalize name, build search text, resolve area -------------------------------
create or replace function private.places_before_write() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  new.name := btrim(new.name);
  new.name_normalized := public.normalize_name(new.name);
  new.search_text := btrim(concat_ws(' ', new.name_normalized,
    (select string_agg(public.normalize_name(a), ' ') from unnest(new.aliases) a)));
  if new.area_id is null then
    new.area_id := private.resolve_area(new.geom);
  end if;
  return new;
end $$;

create trigger places_normalize
  before insert or update of name, aliases, geom on public.places
  for each row execute function private.places_before_write();

create trigger places_updated_at before update on public.places
  for each row execute function public.set_updated_at();

-- profiles: create on signup ------------------------------------------------------------
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into public.profiles (id, display_name, avatar_url, username)
  values (
    new.id,
    -- DECISIONS.md: truncate long Google names so signup can never fail on the length check
    left(coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
                  nullif(btrim(new.raw_user_meta_data->>'name'), ''),
                  'New user'), 60),
    new.raw_user_meta_data->>'avatar_url',
    'user_' || substr(replace(new.id::text, '-', ''), 1, 10)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function private.handle_new_user();

-- profiles: privileged columns can only change via service role / migrations ------------
-- (Column grants in the RLS migration are the main guard; this is defence in depth.)
create or replace function private.prevent_privilege_escalation() returns trigger
language plpgsql set search_path = public, extensions as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.is_admin is distinct from old.is_admin
    or new.banned_at is distinct from old.banned_at
    or new.id is distinct from old.id
    or new.created_at is distinct from old.created_at) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_prevent_escalation before update on public.profiles
  for each row execute function private.prevent_privilege_escalation();

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- visits: date not in the future (IST), never to a merged place ------------------------
create or replace function private.visits_validate() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.visited_on > (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'future_date' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.places where id = new.place_id and status = 'merged') then
    raise exception 'place_merged' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger visits_validate
  before insert or update of visited_on, place_id on public.visits
  for each row execute function private.visits_validate();

-- updated_at on the optional layers ------------------------------------------------------
create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();
create trigger memories_updated_at before update on public.memories
  for each row execute function public.set_updated_at();

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;
