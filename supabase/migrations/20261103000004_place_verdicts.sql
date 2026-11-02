-- P1-06..P1-08 Place page RPCs and the visit rate limit (API_SPEC.md §1, PRODUCT_SPEC §6).
-- Tiers: 0 you, 1 friends, 2 following, 3 everyone. Tiers are never merged or averaged.
set search_path = public, extensions;

-- One place with its area; follows merged_into so old links still resolve.
create or replace function public.get_place(p_place uuid)
returns table (id uuid, name text, area_name text, area_slug text, type place_type, diet_flags text[],
               cuisine_tags text[], status place_status, merged_into uuid, lat double precision,
               lng double precision, brand_name text)
language sql stable security definer set search_path = public, extensions as $$
  with recursive chain as (
    select p.id, p.merged_into, 0 as depth from public.places p where p.id = p_place
    union all
    select p.id, p.merged_into, c.depth + 1 from public.places p join chain c on p.id = c.merged_into
    where c.depth < 5
  ), final as (
    select c.id from chain c where c.merged_into is null order by c.depth desc limit 1
  )
  select p.id, p.name, a.name, a.slug, p.type, p.diet_flags, p.cuisine_tags, p.status,
         case when p.id <> p_place then p.id end,
         st_y(p.geom::geometry), st_x(p.geom::geometry), b.name
  from final f
  join public.places p on p.id = f.id
  left join public.areas a on a.id = p.area_id
  left join public.brands b on b.id = p.brand_id
  where auth.uid() is not null;
$$;

-- Each author's most recent visit at this place that the viewer may see (shared by the
-- summary and the verdict list so they can never disagree).
create or replace function private.latest_visible_verdicts(p_place uuid, p_viewer uuid)
returns table (visit_id uuid, author_id uuid, verdict verdict, only_for_text text,
               visited_on date, logged_at timestamptz, tier smallint)
language sql stable security definer set search_path = public, extensions as $$
  with latest as (
    select distinct on (v.user_id) v.id, v.user_id, v.verdict, v.only_for_text, v.visited_on, v.logged_at
    from public.visits v
    where v.place_id = p_place
      and private.can_view_visit(p_viewer, v.id, v.user_id, v.visibility)
    order by v.user_id, v.visited_on desc, v.logged_at desc, v.id desc
  )
  select l.id, l.user_id, l.verdict, l.only_for_text, l.visited_on, l.logged_at,
         private.relationship_tier(p_viewer, l.user_id)
  from latest l
  where private.relationship_tier(p_viewer, l.user_id) is not null;
$$;

create or replace function public.get_place_summary(p_place uuid)
returns table (tier smallint, went int, go_count int, skip_count int, only_for_count int)
language sql stable security definer set search_path = public, extensions as $$
  select t.tier, count(*)::int,
         count(*) filter (where t.verdict = 'go')::int,
         count(*) filter (where t.verdict = 'skip')::int,
         count(*) filter (where t.verdict = 'only_for')::int
  from private.latest_visible_verdicts(p_place, auth.uid()) t
  where auth.uid() is not null
  group by t.tier
  order by t.tier;
$$;

-- p_tier_filter: 'friends' (you + friends), 'friends_following', 'everyone'.
-- Ordered: tier, then (following) taste match, then newest. One row per author.
create or replace function public.get_place_verdicts(
  p_place uuid, p_tier_filter text default 'friends_following', p_limit int default 100)
returns table (visit_id uuid, author_id uuid, username text, display_name text, avatar_url text,
               tier smallint, group_name text, verdict verdict, only_for_text text,
               visited_on date, logged_at timestamptz)
language sql stable security definer set search_path = public, extensions as $$
  select t.visit_id, t.author_id, p.username::text, p.display_name, p.avatar_url, t.tier,
         null::text, t.verdict, t.only_for_text, t.visited_on, t.logged_at
  from private.latest_visible_verdicts(p_place, auth.uid()) t
  join public.profiles p on p.id = t.author_id
  left join public.taste_matches m
    on t.tier = 2
   and m.user_a = least(auth.uid(), t.author_id) and m.user_b = greatest(auth.uid(), t.author_id)
   and m.shared_places >= 5
  where auth.uid() is not null
    and t.tier <= case p_tier_filter when 'friends' then 1 when 'friends_following' then 2 else 3 end
  order by t.tier, case when t.tier = 2 then m.rate end desc nulls last, t.visited_on desc, t.logged_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

-- Visits: daily cap of 60 logs per person (SECURITY_PRIVACY §7), separate from the scoring cap.
create or replace function private.visits_rate_limit() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if current_user = 'authenticated' and (
       select count(*) from public.visits
        where user_id = new.user_id and logged_at >= private.ist_day_start()) >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger visits_rate_limit before insert on public.visits
  for each row execute function private.visits_rate_limit();

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;
grant execute on function public.get_place(uuid), public.get_place_summary(uuid),
  public.get_place_verdicts(uuid, text, int) to authenticated;
