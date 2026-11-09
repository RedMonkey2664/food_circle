-- Discover > Places (2026-11-08, human request): places near a chosen city / "near me" point
-- that people liked, from SKOOP verdicts only (never third-party reviews). Tiers are never
-- blended: Go counts come back per tier and the ranking is tier by tier (friends first).
set search_path = public, extensions;

create or replace function public.get_recommended_places(
  p_lat double precision, p_lng double precision,
  p_radius_m int default 6000, p_limit int default 30)
returns table (place_id uuid, name text, area_name text, type place_type, distance_m double precision,
               friend_go int, friend_went int, following_go int, following_went int,
               everyone_go int, everyone_went int, thumb_url text)
language sql stable security definer set search_path = public, extensions as $$
  with pt as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g,
           least(greatest(coalesce(p_radius_m, 6000), 500), 20000) as r
  ),
  latest as (
    -- each author's latest visit per place that the viewer may see
    select distinct on (v.place_id, v.user_id) v.place_id, v.user_id, v.verdict
      from public.visits v
      join public.places p on p.id = v.place_id, pt
     where auth.uid() is not null
       and p.status not in ('merged', 'closed')
       and st_dwithin(p.geom, pt.g, pt.r)
       and v.user_id <> auth.uid()
       and private.can_view_visit(auth.uid(), v.id, v.user_id, v.visibility)
     order by v.place_id, v.user_id, v.visited_on desc, v.logged_at desc, v.id desc
  ),
  tiered as (
    select l.place_id, l.verdict, private.relationship_tier(auth.uid(), l.user_id) as tier
      from latest l
  ),
  agg as (
    select place_id,
           count(*) filter (where tier = 1 and verdict = 'go')::int as friend_go,
           count(*) filter (where tier = 1)::int as friend_went,
           count(*) filter (where tier = 2 and verdict = 'go')::int as following_go,
           count(*) filter (where tier = 2)::int as following_went,
           count(*) filter (where tier = 3 and verdict = 'go')::int as everyone_go,
           count(*) filter (where tier = 3)::int as everyone_went
      from tiered
     where tier in (1, 2, 3)
     group by place_id
  )
  select p.id, p.name, a.name, p.type, st_distance(p.geom, pt.g),
         g.friend_go, g.friend_went, g.following_go, g.following_went, g.everyone_go, g.everyone_went,
         (select m.thumb_url from public.place_media m where m.place_id = p.id order by m.position limit 1)
    from agg g
    join public.places p on p.id = g.place_id
    left join public.areas a on a.id = p.area_id, pt
   where (g.friend_go + g.following_go + g.everyone_go) > 0
     -- places you have already been to are not "recommendations"
     and not exists (select 1 from public.visits mine where mine.user_id = auth.uid() and mine.place_id = p.id)
   order by g.friend_go desc, g.following_go desc, g.everyone_go desc, st_distance(p.geom, pt.g)
   limit least(greatest(coalesce(p_limit, 30), 1), 50);
$$;

-- Well-known spots nearby (they have a Wikimedia photo/description): fills Discover > Places
-- while there are few SKOOP verdicts in a city.
create or replace function public.get_notable_places(
  p_lat double precision, p_lng double precision,
  p_radius_m int default 8000, p_limit int default 12)
returns table (place_id uuid, name text, area_name text, type place_type, distance_m double precision,
               short_description text, thumb_url text)
language sql stable security definer set search_path = public, extensions as $$
  with pt as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g,
           least(greatest(coalesce(p_radius_m, 8000), 500), 25000) as r
  )
  select p.id, p.name, a.name, p.type, st_distance(p.geom, pt.g), i.short_description,
         (select m.thumb_url from public.place_media m where m.place_id = p.id order by m.position limit 1)
    from public.place_info i
    join public.places p on p.id = i.place_id
    left join public.areas a on a.id = p.area_id, pt
   where auth.uid() is not null
     and p.status not in ('merged', 'closed')
     and st_dwithin(p.geom, pt.g, pt.r)
   order by st_distance(p.geom, pt.g)
   limit least(greatest(coalesce(p_limit, 12), 1), 30);
$$;

revoke all on function public.get_recommended_places(double precision, double precision, int, int) from public, anon;
grant execute on function public.get_recommended_places(double precision, double precision, int, int) to authenticated;
revoke all on function public.get_notable_places(double precision, double precision, int, int) from public, anon;
grant execute on function public.get_notable_places(double precision, double precision, int, int) to authenticated;
