-- P1-10 Home feed (API_SPEC.md get_home_feed). Tabs: 'friends' (tier 1), 'following' (tier 2:
-- people you follow who aren't friends; tiers are disjoint). Newest first by (logged_at, id),
-- cursor pagination, only visits the viewer may see, muted people excluded.
set search_path = public, extensions;

create or replace function public.get_home_feed(
  p_tab text,
  p_limit int default 20,
  p_cursor_ts timestamptz default null,
  p_cursor_id uuid default null)
returns table (visit_id uuid, author_id uuid, username text, display_name text, avatar_url text,
               tier smallint, place_id uuid, place_name text, area_name text, verdict verdict,
               only_for_text text, visited_on date, logged_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  if p_tab not in ('friends', 'following') then raise exception 'invalid_input' using errcode = 'P0001'; end if;

  return query
  with friends as (
    select case when f.user_low = uid then f.user_high else f.user_low end as id
    from public.friendships f
    where uid in (f.user_low, f.user_high) and f.status = 'accepted'
  ), authors as (
    select id, 1::smallint as t from friends where p_tab = 'friends'
    union all
    select fo.following_id, 2::smallint from public.follows fo
    where p_tab = 'following' and fo.follower_id = uid and fo.status = 'accepted'
      and fo.following_id not in (select id from friends)
  )
  select v.id, v.user_id, pr.username::text, pr.display_name, pr.avatar_url, a.t,
         pl.id, pl.name, ar.name, v.verdict, v.only_for_text, v.visited_on, v.logged_at
  from authors a
  join public.visits v on v.user_id = a.id
  join public.profiles pr on pr.id = v.user_id
  join public.places pl on pl.id = v.place_id
  left join public.areas ar on ar.id = pl.area_id
  where not exists (select 1 from public.mutes m where m.muter_id = uid and m.muted_id = v.user_id)
    and private.can_view_visit(uid, v.id, v.user_id, v.visibility)
    and (p_cursor_ts is null or (v.logged_at, v.id) < (p_cursor_ts, p_cursor_id))
  order by v.logged_at desc, v.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;

grant execute on function public.get_home_feed(text, int, timestamptz, uuid) to authenticated;
