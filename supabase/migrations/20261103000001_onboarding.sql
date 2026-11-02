-- P1-01 Onboarding RPCs.
-- onboarded_at is not client-writable (column grants), so completion goes through here.
set search_path = public, extensions;

-- Usernames that would confuse people or collide with routes.
create or replace function private.is_reserved_username(u text) returns boolean
language sql immutable set search_path = public, extensions as $$
  select lower(u) = any (array[
    'admin','administrator','support','help','about','settings','login','logout','signup',
    'onboarding','invite','friends','discover','diary','log','me','u','place','places','search',
    'api','auth','dev','foodcircle','food_circle','food.circle','root','system','null','undefined'
  ]) or lower(u) like 'user\_%';
$$;

-- RPC: is this username free for the caller? (true also when it's already the caller's own)
create or replace function public.username_available(p_username text) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  if p_username is null or p_username !~ '^[a-z0-9_.]{3,24}$' or private.is_reserved_username(p_username) then
    return false;
  end if;
  return not exists (select 1 from public.profiles where username = p_username::citext and id <> uid);
end $$;

-- RPC: save onboarding answers and mark the profile as onboarded.
create or replace function public.complete_onboarding(
  p_username text,
  p_display_name text,
  p_home_area uuid,
  p_diet_prefs text[],
  p_is_private boolean,
  p_default_visibility visibility)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  if not private.is_active_user(uid) then raise exception 'forbidden' using errcode = 'P0001'; end if;

  p_username := lower(btrim(coalesce(p_username, '')));
  p_display_name := btrim(coalesce(p_display_name, ''));

  if p_username !~ '^[a-z0-9_.]{3,24}$' or private.is_reserved_username(p_username) then
    raise exception 'invalid_input' using errcode = 'P0001', detail = 'username';
  end if;
  if char_length(p_display_name) not between 1 and 60 then
    raise exception 'invalid_input' using errcode = 'P0001', detail = 'display_name';
  end if;
  if p_home_area is not null and not exists (select 1 from public.areas where id = p_home_area and kind <> 'region') then
    raise exception 'invalid_input' using errcode = 'P0001', detail = 'home_area';
  end if;
  if not (coalesce(p_diet_prefs, '{}') <@ array['veg','jain','halal','egg','nonveg']) then
    raise exception 'invalid_input' using errcode = 'P0001', detail = 'diet_prefs';
  end if;
  -- Privacy defaults go narrower: a private account can't default to public entries.
  if p_is_private and p_default_visibility = 'public' then
    raise exception 'invalid_input' using errcode = 'P0001', detail = 'default_visibility';
  end if;
  if exists (select 1 from public.profiles where username = p_username::citext and id <> uid) then
    raise exception 'username_taken' using errcode = 'P0001';
  end if;

  update public.profiles set
    username = p_username,
    display_name = p_display_name,
    home_area_id = p_home_area,
    diet_prefs = coalesce(p_diet_prefs, '{}'),
    is_private = coalesce(p_is_private, false),
    default_visibility = p_default_visibility,
    onboarded_at = coalesce(onboarded_at, now())
  where id = uid;
end $$;

revoke all on function private.is_reserved_username(text) from public;
grant execute on function private.is_reserved_username(text) to authenticated, service_role;
grant execute on function public.username_available(text) to authenticated;
grant execute on function public.complete_onboarding(text, text, uuid, text[], boolean, visibility) to authenticated;
