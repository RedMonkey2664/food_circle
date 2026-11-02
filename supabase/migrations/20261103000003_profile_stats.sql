-- P1-11 Profile counts. RLS only exposes your own relationship rows, so counts for other
-- people come from this function. It returns numbers only (never who), and nothing when
-- either side has blocked the other.
set search_path = public, extensions;

create or replace function public.get_profile_stats(p_user uuid)
returns table (friends int, followers int, following int, visits_visible int, places_visible int)
language plpgsql stable security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  if private.is_blocked_between(uid, p_user) then return; end if;
  return query select
    (select count(*)::int from public.friendships f
      where p_user in (f.user_low, f.user_high) and f.status = 'accepted'),
    (select count(*)::int from public.follows f where f.following_id = p_user and f.status = 'accepted'),
    (select count(*)::int from public.follows f where f.follower_id = p_user and f.status = 'accepted'),
    (select count(*)::int from public.visits v
      where v.user_id = p_user and private.can_view_visit(uid, v.id, v.user_id, v.visibility)),
    (select count(distinct v.place_id)::int from public.visits v
      where v.user_id = p_user and private.can_view_visit(uid, v.id, v.user_id, v.visibility));
end $$;

grant execute on function public.get_profile_stats(uuid) to authenticated;
