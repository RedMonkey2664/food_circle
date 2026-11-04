-- Phase 7: India polish (PHASES.md P7-01..P7-07; P7-08 phone OTP on hold by the human).
-- P7-02 "area boards" is replaced by personal neighbourhood achievements (no competition,
-- human decision 2026-11-03).
set search_path = public, extensions;

-- ---------------------------------------------------------------------------------------
-- P7-01: Mumbai local-train stations (OSM railway=station/halt on the suburban network;
-- monorail and metro excluded). Reference data, (c) OpenStreetMap contributors, ODbL.
-- ---------------------------------------------------------------------------------------
create table public.stations (
  id uuid primary key default gen_random_uuid(),
  osm_id text unique not null,
  name text not null,
  geom geography(Point, 4326) not null
);
create index stations_geom_gix on public.stations using gist (geom);
alter table public.stations enable row level security;
create policy stations_select on public.stations for select to authenticated using (true);
grant select on public.stations to authenticated;

insert into public.stations (osm_id, name, geom) values
  ('node/5696928866', 'Andheri', st_setsrid(st_makepoint(72.8464205, 19.1196976), 4326)::geography),
  ('node/2630075000', 'Bandra', st_setsrid(st_makepoint(72.8402203, 19.0549792), 4326)::geography),
  ('node/3248305759', 'Bhandup', st_setsrid(st_makepoint(72.9376543, 19.142757), 4326)::geography),
  ('node/3347009325', 'Borivali', st_setsrid(st_makepoint(72.8573628, 19.229068), 4326)::geography),
  ('node/2630075001', 'Byculla', st_setsrid(st_makepoint(72.8327936, 18.9766219), 4326)::geography),
  ('node/2630075002', 'Charni Road', st_setsrid(st_makepoint(72.8182401, 18.9518437), 4326)::geography),
  ('node/2454571178', 'Chembur', st_setsrid(st_makepoint(72.9011399, 19.0626319), 4326)::geography),
  ('node/3501418211', 'Chinchpokli', st_setsrid(st_makepoint(72.8326716, 18.9871984), 4326)::geography),
  ('node/2663219988', 'Chuna Bhatti', st_setsrid(st_makepoint(72.8690974, 19.0517703), 4326)::geography),
  ('node/4260136290', 'Churchgate', st_setsrid(st_makepoint(72.8271741, 18.9354797), 4326)::geography),
  ('node/700886403', 'Cotton Green', st_setsrid(st_makepoint(72.8438965, 18.9871866), 4326)::geography),
  ('node/2444001671', 'Currey Road', st_setsrid(st_makepoint(72.8328556, 18.9937486), 4326)::geography),
  ('node/2630075003', 'Dadar', st_setsrid(st_makepoint(72.8430265, 19.0173761), 4326)::geography),
  ('node/213030669', 'Dahisar', st_setsrid(st_makepoint(72.8596302, 19.2493572), 4326)::geography),
  ('node/2443092123', 'Dockyard Road', st_setsrid(st_makepoint(72.8445477, 18.9674767), 4326)::geography),
  ('node/7555912827', 'Dronagiri', st_setsrid(st_makepoint(72.9647315, 18.8813327), 4326)::geography),
  ('node/4264539430', 'Ghatkopar', st_setsrid(st_makepoint(72.9083668, 19.0856928), 4326)::geography),
  ('node/3347034961', 'Goregaon', st_setsrid(st_makepoint(72.8495492, 19.1648688), 4326)::geography),
  ('node/3205733664', 'Govandi', st_setsrid(st_makepoint(72.9150702, 19.0553688), 4326)::geography),
  ('node/631579580', 'Grant Road', st_setsrid(st_makepoint(72.8158261, 18.9633549), 4326)::geography),
  ('node/4264841906', 'Guru Tegh Bahadur Nagar', st_setsrid(st_makepoint(72.8643455, 19.0380048), 4326)::geography),
  ('node/12189351698', 'Jogeshwari (Harbour Line)', st_setsrid(st_makepoint(72.8494209, 19.1411537), 4326)::geography),
  ('node/12189363305', 'Jogeshwari (Western Line)', st_setsrid(st_makepoint(72.848936, 19.1361144), 4326)::geography),
  ('node/619119023', 'Kalva', st_setsrid(st_makepoint(72.9963331, 19.1952243), 4326)::geography),
  ('node/3347023609', 'Kandivali', st_setsrid(st_makepoint(72.8517376, 19.2041136), 4326)::geography),
  ('node/619992025', 'Kanjur Marg', st_setsrid(st_makepoint(72.9280394, 19.1286526), 4326)::geography),
  ('node/347138797', 'Khar Road', st_setsrid(st_makepoint(72.8400412, 19.0682411), 4326)::geography),
  ('node/30518361', 'Kharbhav', st_setsrid(st_makepoint(72.9844677, 19.298321), 4326)::geography),
  ('node/1650694464', 'King''s Circle', st_setsrid(st_makepoint(72.8577375, 19.0316822), 4326)::geography),
  ('node/2663447640', 'Kurla', st_setsrid(st_makepoint(72.8793805, 19.0652797), 4326)::geography),
  ('node/6175360983', 'Lokmanya Tilak Terminus', st_setsrid(st_makepoint(72.8919779, 19.0694658), 4326)::geography),
  ('node/621911847', 'Lower Parel', st_setsrid(st_makepoint(72.8302756, 18.99568), 4326)::geography),
  ('node/4264478427', 'Mahalaxmi', st_setsrid(st_makepoint(72.8242196, 18.9825203), 4326)::geography),
  ('node/2630075005', 'Mahim Junction', st_setsrid(st_makepoint(72.8466038, 19.0406634), 4326)::geography),
  ('node/3347034598', 'Malad', st_setsrid(st_makepoint(72.8485884, 19.1867193), 4326)::geography),
  ('node/2629720841', 'Mankhurd', st_setsrid(st_makepoint(72.9317136, 19.0482086), 4326)::geography),
  ('node/2630075006', 'Marine Lines', st_setsrid(st_makepoint(72.8237193, 18.945764), 4326)::geography),
  ('node/12171122260', 'Masjid', st_setsrid(st_makepoint(72.8381771, 18.9522949), 4326)::geography),
  ('node/4264457295', 'Matunga', st_setsrid(st_makepoint(72.8501467, 19.0274356), 4326)::geography),
  ('node/5122858908', 'Mira Road', st_setsrid(st_makepoint(72.8560676, 19.2816975), 4326)::geography),
  ('node/1643351703', 'Mulund', st_setsrid(st_makepoint(72.9566971, 19.1721366), 4326)::geography),
  ('node/12176277888', 'Mumbai CSMT', st_setsrid(st_makepoint(72.8357856, 18.9404925), 4326)::geography),
  ('node/2630075008', 'Mumbai Central', st_setsrid(st_makepoint(72.8193152, 18.9695855), 4326)::geography),
  ('node/2629791007', 'Nahur', st_setsrid(st_makepoint(72.9466525, 19.1546402), 4326)::geography),
  ('node/7555912828', 'Nhava Sheva', st_setsrid(st_makepoint(72.9877967, 18.898061), 4326)::geography),
  ('node/3501418212', 'Parel', st_setsrid(st_makepoint(72.8376614, 19.0094817), 4326)::geography),
  ('node/3462327239', 'Prabhadevi', st_setsrid(st_makepoint(72.8358965, 19.0074717), 4326)::geography),
  ('node/5909533857', 'Ram Mandir', st_setsrid(st_makepoint(72.8501467, 19.151023), 4326)::geography),
  ('node/2443096202', 'Reay Road', st_setsrid(st_makepoint(72.8441011, 18.9775506), 4326)::geography),
  ('node/2178163576', 'Sandhurst Road', st_setsrid(st_makepoint(72.8393719, 18.9609243), 4326)::geography),
  ('node/213030714', 'Santa Cruz', st_setsrid(st_makepoint(72.8417565, 19.0815223), 4326)::geography),
  ('node/700886180', 'Sewri', st_setsrid(st_makepoint(72.8544218, 18.9987796), 4326)::geography),
  ('node/2663263713', 'Sion', st_setsrid(st_makepoint(72.8632834, 19.0465213), 4326)::geography),
  ('node/246582717', 'Thane', st_setsrid(st_makepoint(72.9757664, 19.186483), 4326)::geography),
  ('node/3530903066', 'Tilak Nagar', st_setsrid(st_makepoint(72.8904702, 19.0657855), 4326)::geography),
  ('node/620013256', 'Vidyavihar', st_setsrid(st_makepoint(72.8971169, 19.0795422), 4326)::geography),
  ('node/4258411797', 'Vikhroli', st_setsrid(st_makepoint(72.928021, 19.1114795), 4326)::geography),
  ('node/2630075010', 'Vile Parle', st_setsrid(st_makepoint(72.8440038, 19.0999098), 4326)::geography)
on conflict (osm_id) do nothing;

create or replace function private.badge_progress(p_user uuid, p_rule jsonb) returns int
language plpgsql stable security definer set search_path = public, extensions as $$
declare t text := p_rule->>'type'; n int := 0;
begin
  case t
    when 'total_places' then
      select count(distinct place_id) into n from public.visits where user_id = p_user and counts_all_time;
    when 'unique_places_of_type' then
      select count(distinct v.place_id) into n
      from public.visits v join public.places p on p.id = v.place_id
      where v.user_id = p_user and v.counts_all_time and p.type::text = p_rule->>'place_type';
    when 'unique_places_with_cuisine' then
      select count(distinct v.place_id) into n
      from public.visits v join public.places p on p.id = v.place_id
      where v.user_id = p_user and v.counts_all_time and (p_rule->>'cuisine_tag') = any (p.cuisine_tags);
    when 'unique_cuisines' then
      select count(distinct c) into n
      from public.visits v join public.places p on p.id = v.place_id, unnest(p.cuisine_tags) c
      where v.user_id = p_user and v.counts_all_time;
    when 'diet_places' then
      select count(distinct v.place_id) into n
      from public.visits v join public.places p on p.id = v.place_id
      where v.user_id = p_user and v.counts_all_time and (p_rule->>'flag') = any (p.diet_flags);
    when 'independent_places' then
      select count(distinct v.place_id) into n
      from public.visits v join public.places p on p.id = v.place_id
      where v.user_id = p_user and v.counts_all_time and p.brand_id is null;
    when 'unique_places_in_areas' then
      select count(distinct v.place_id) into n
      from public.visits v join public.places p on p.id = v.place_id
      join public.areas a on a.id = p.area_id
      left join public.areas parent on parent.id = a.parent_id
      where v.user_id = p_user and v.counts_all_time
        and (a.slug in (select jsonb_array_elements_text(p_rule->'area_slugs'))
             or parent.slug in (select jsonb_array_elements_text(p_rule->'area_slugs')));
    when 'unique_places_in_region' then
      select count(distinct v.place_id) into n
      from public.visits v join public.places p on p.id = v.place_id
      join public.areas a on a.id = p.area_id
      left join public.areas parent on parent.id = a.parent_id
      left join public.areas grand on grand.id = parent.parent_id
      where v.user_id = p_user and v.counts_all_time
        and p_rule->>'region_slug' in (a.slug, parent.slug, grand.slug);
    when 'unique_areas' then
      select count(distinct coalesce(case when a.kind = coalesce(p_rule->>'kind', a.kind) then a.id end,
                                     case when parent.kind = p_rule->>'kind' then parent.id end)) into n
      from public.visits v join public.places p on p.id = v.place_id
      join public.areas a on a.id = p.area_id
      left join public.areas parent on parent.id = a.parent_id
      where v.user_id = p_user and v.counts_all_time;
    when 'regions_covered' then
      select count(distinct coalesce(case when grand.kind = 'region' then grand.id end,
                                     case when parent.kind = 'region' then parent.id end,
                                     case when a.kind = 'region' then a.id end)) into n
      from public.visits v join public.places p on p.id = v.place_id
      join public.areas a on a.id = p.area_id
      left join public.areas parent on parent.id = a.parent_id
      left join public.areas grand on grand.id = parent.parent_id
      where v.user_id = p_user and v.counts_all_time;
    when 'verdict_count' then
      select count(distinct place_id) into n from public.visits
      where user_id = p_user and verdict::text = p_rule->>'verdict';
    when 'skip_and_go_balance' then
      select least(count(distinct place_id) filter (where verdict = 'skip'),
                   count(distinct place_id) filter (where verdict = 'go')) into n
      from public.visits where user_id = p_user;
    when 'price_at_least' then
      select count(*) into n from public.reviews r join public.visits v on v.id = r.visit_id
      where v.user_id = p_user and r.price_per_head >= (p_rule->>'amount')::int;
    when 'price_at_most' then
      select count(*) into n from public.reviews r join public.visits v on v.id = r.visit_id
      where v.user_id = p_user and r.price_per_head is not null and r.price_per_head <= (p_rule->>'amount')::int;
    when 'logged_between' then
      -- Visits logged within an IST hour window; "from" > "to" wraps past midnight.
      select count(*) into n from public.visits v
      where v.user_id = p_user and v.is_first_visit and not v.is_backdated
        and case when (p_rule->>'from')::int <= (p_rule->>'to')::int
                 then extract(hour from v.logged_at at time zone 'Asia/Kolkata') >= (p_rule->>'from')::int
                  and extract(hour from v.logged_at at time zone 'Asia/Kolkata') < (p_rule->>'to')::int
                 else extract(hour from v.logged_at at time zone 'Asia/Kolkata') >= (p_rule->>'from')::int
                  or extract(hour from v.logged_at at time zone 'Asia/Kolkata') < (p_rule->>'to')::int end;
    when 'same_place_visits' then
      select coalesce(max(c), 0) into n from (
        select count(*) c from public.visits where user_id = p_user group by place_id) x;
    when 'photos' then
      select count(*) into n from public.visit_photos ph join public.visits v on v.id = ph.visit_id
      where v.user_id = p_user;
    when 'dish_verdicts' then
      select count(*) into n from public.review_dishes d join public.visits v on v.id = d.visit_id
      where v.user_id = p_user;
    when 'notes' then
      select count(*) into n from public.reviews r join public.visits v on v.id = r.visit_id
      where v.user_id = p_user and nullif(btrim(r.note), '') is not null;
    when 'want_to_go' then
      select count(*) into n from public.want_to_go where user_id = p_user;
    when 'places_added' then
      select count(*) into n from public.places where created_by = p_user and status <> 'merged';
    when 'first_among_friends' then
      select count(*) into n from (
        select v.place_id from public.visits v
        where v.user_id = p_user and v.counts_all_time
          and exists (select 1 from public.visits f where f.place_id = v.place_id and f.user_id <> p_user
                        and private.are_friends(p_user, f.user_id) and f.logged_at > v.logged_at)
          and not exists (select 1 from public.visits f where f.place_id = v.place_id and f.user_id <> p_user
                            and private.are_friends(p_user, f.user_id) and f.logged_at < v.logged_at)) x;
    when 'streak_weeks' then
      select coalesce(best_streak, 0) into n from public.user_streaks where user_id = p_user;
    when 'near_stations' then
      -- Distinct local-train stations with a counted place of yours within 400 m.
      select count(distinct s.id) into n
      from public.visits v join public.places p on p.id = v.place_id
      join public.stations s on st_dwithin(s.geom, p.geom, 400)
      where v.user_id = p_user and v.counts_all_time;
    when 'friends_acted_on_go' then
      -- A friend's first visit to a place within N days after your (non-private) Go there.
      -- A proxy: we can't know they saw it. Friends only, so it rewards trust, not reach.
      select count(*) into n from (
        select distinct f.user_id, f.place_id
        from public.visits g
        join public.visits f on f.place_id = g.place_id and f.user_id <> g.user_id
         and f.logged_at > g.logged_at
         and f.logged_at <= g.logged_at + make_interval(days => coalesce((p_rule->>'window_days')::int, 30))
         and f.is_first_visit
        where g.user_id = p_user and g.verdict = 'go' and g.visibility <> 'private'
          and private.are_friends(p_user, f.user_id)) x;
    when 'family_visits' then
      -- Your visits with a tagged companion who shares one of your Family groups.
      select count(distinct v.id) into n
      from public.visits v
      join public.visit_companions c on c.visit_id = v.id
      join public.group_members m on m.user_id = c.user_id
      join public.groups g on g.id = m.group_id and g.kind = 'family'
      join public.group_members me on me.group_id = g.id and me.user_id = p_user
      where v.user_id = p_user;
    else
      return 0;
  end case;
  return coalesce(n, 0);
end $$;

-- More achievements (data only). Upsert by slug.
insert into public.badges (slug, name, description, category, rule, icon, is_secret, sort, is_active) values
  ('local-train-foodie', 'Next Station: Snacks', 'Ate near ten different local-train stations. The 8:42 fast is basically your food tour.', 'exploration', '{"type":"near_stations","threshold":10}', '🚉', false, 36, true),
  ('platform-gourmet', 'Platform Number Gourmet', 'Ate near 25 different stations. You rate neighbourhoods by their station-side vada pav.', 'exploration', '{"type":"near_stations","threshold":25}', '🛤️', false, 37, true),
  ('thali-master', 'Thali Mahaan', 'Five thali places. You have never once said "bas, enough". Refills are a lifestyle.', 'culture', '{"type":"unique_places_with_cuisine","cuisine_tag":"gujarati_thali","threshold":5}', '🍛', false, 29, true),
  ('trusted-taster', 'The Unpaid Influencer', 'Five times, a friend went somewhere within a month of your Go. Brands, take note.', 'behaviour', '{"type":"friends_acted_on_go","window_days":30,"threshold":5}', '🤝', false, 48, true),
  ('family-table', 'Family Table, Full Plates', 'Five meals tagged with someone from your Family group. Mummy approved.', 'culture', '{"type":"family_visits","threshold":5}', '👨‍👩‍👧', false, 49, true),
  ('stamp-collector', 'Neighbourhood Stamp Collector', '30 different neighbourhoods. Your passport is a food diary and it is full.', 'exploration', '{"type":"unique_areas","threshold":30}', '🗳️', false, 38, true),
  ('suburb-sommelier', 'Suburb Sommelier', 'Ate in ten different suburbs. You can taste the difference between Andheri and Borivali.', 'exploration', '{"type":"unique_areas","kind":"suburb","threshold":10}', '🍷', false, 39, true)
on conflict (slug) do update
  set name = excluded.name, description = excluded.description, category = excluded.category,
      rule = excluded.rule, icon = excluded.icon, is_secret = excluded.is_secret, sort = excluded.sort,
      is_active = excluded.is_active;

-- ---------------------------------------------------------------------------------------
-- P7-06: Hinglish-friendly search. Common alternate spellings fold to one form, stored in
-- search_text next to the original and applied to queries, so "wada pao" finds "Vada Pav".
-- ---------------------------------------------------------------------------------------
create or replace function public.hinglish_fold(t text) returns text
language sql immutable parallel safe as $$
  select regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
         regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
         regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
           coalesce(t, ''),
           '\mwada\M', 'vada', 'g'),
           '\mvadapav\M', 'vada pav', 'g'),
           '\m(pao|paav|pau)\M', 'pav', 'g'),
           '\m(chay|chaay|chaai|chaa)\M', 'chai', 'g'),
           '\mbhaaji\M', 'bhaji', 'g'),
           '\mpaani\M', 'pani', 'g'),
           '\m(poori|pooree)\M', 'puri', 'g'),
           '\m(idly|iddli)\M', 'idli', 'g'),
           '\m(biriyani|briyani|biryaani|biriani)\M', 'biryani', 'g'),
           '\m(kabab|kabob)\M', 'kebab', 'g'),
           '\m(franky|frankey)\M', 'frankie', 'g'),
           '\m(mithaai|mithae)\M', 'mithai', 'g'),
           '\m(sandwitch|sandwhich)\M', 'sandwich', 'g'),
           '\mmomo\M', 'momos', 'g'),
           '\m(faluda|phaluda)\M', 'falooda', 'g');
$$;

create or replace function private.places_before_write() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  new.name := btrim(new.name);
  new.name_normalized := public.normalize_name(new.name);
  new.search_text := btrim(concat_ws(' ', new.name_normalized,
    (select string_agg(public.normalize_name(a), ' ') from unnest(new.aliases) a)));
  -- Add the folded spelling when it differs, so "wada pav" and "vada pav" find each other.
  if public.hinglish_fold(new.search_text) <> new.search_text then
    new.search_text := new.search_text || ' ' || public.hinglish_fold(new.search_text);
  end if;
  if new.area_id is null then
    new.area_id := private.resolve_area(new.geom);
  end if;
  return new;
end $$;

-- Recompute search_text where a fold applies (fires the trigger; areas are kept).
update public.places set aliases = aliases
 where public.hinglish_fold(name_normalized) <> name_normalized;

create or replace function public.search_places(
  p_query text,
  p_lat double precision default null,
  p_lng double precision default null,
  p_limit int default 20)
returns table (id uuid, name text, area_name text, type place_type, diet_flags text[],
               distance_m double precision, rank real)
language plpgsql stable
set search_path = public, extensions
as $$
declare
  -- P7-06: fold Hinglish spellings so "wada pao" finds "Vada Pav" (place search_text holds both).
  v_nq text := public.hinglish_fold(public.normalize_name(left(p_query, 120)));
  v_pt geography := case when p_lat is null or p_lng is null then null
                         else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end;
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  if length(v_nq) < 2 then
    return;
  end if;
  return query
  select p.id, p.name, a.name, p.type, p.diet_flags,
         case when v_pt is null then null else st_distance(p.geom, v_pt) end,
         (similarity(p.search_text, v_nq)
          + case when p.name_normalized like v_nq || '%' then 0.4
                 when p.search_text like '% ' || v_nq || '%' then 0.25 else 0 end
          - case when p.status = 'unverified' then 0.08 else 0 end
          + case when v_pt is null then 0
                 else greatest(0, 0.2 - st_distance(p.geom, v_pt) / 50000.0) end)::real
  from public.places p
  left join public.areas a on a.id = p.area_id
  where p.status not in ('merged','closed')
    and (case when length(v_nq) < 3
              then p.name_normalized like v_nq || '%'
              else (p.search_text % v_nq or p.search_text like '%' || v_nq || '%') end)
  order by 7 desc, p.name
  limit v_limit;
end $$;

-- ---------------------------------------------------------------------------------------
-- P7-03: year in food (your own data only)
-- ---------------------------------------------------------------------------------------
create or replace function public.get_year_recap(p_year int)
returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  with mine as (
    select v.*, p.name as place_name, p.cuisine_tags, a.name as area_name
    from public.visits v join public.places p on p.id = v.place_id
    left join public.areas a on a.id = p.area_id
    where v.user_id = auth.uid() and extract(year from v.visited_on) = p_year
  )
  select case when auth.uid() is null then null else jsonb_build_object(
    'year', p_year,
    'visits', (select count(*) from mine),
    'places', (select count(distinct place_id) from mine),
    'new_places', (select count(*) from mine where counts_all_time),
    'areas', (select count(distinct area_name) from mine where area_name is not null),
    'go', (select count(*) from mine where verdict = 'go'),
    'skip', (select count(*) from mine where verdict = 'skip'),
    'only_for', (select count(*) from mine where verdict = 'only_for'),
    'top_areas', coalesce((select jsonb_agg(x) from (
        select area_name as name, count(distinct place_id) as places from mine
        where area_name is not null group by area_name order by 2 desc, 1 limit 3) x), '[]'),
    'top_cuisines', coalesce((select jsonb_agg(x) from (
        select c as name, count(distinct place_id) as places from mine, unnest(cuisine_tags) c
        group by c order by 2 desc, 1 limit 3) x), '[]'),
    'favourite', (select jsonb_build_object('name', place_name, 'visits', count(*)) from mine
        group by place_id, place_name having count(*) > 1 order by count(*) desc, min(logged_at) limit 1),
    'first', (select jsonb_build_object('name', place_name, 'date', visited_on) from mine
        order by visited_on, logged_at limit 1),
    'busiest_month', (select to_char(make_date(p_year, m, 1), 'FMMonth') from (
        select extract(month from visited_on)::int as m, count(*) c from mine group by 1 order by 2 desc, 1 limit 1) bm),
    'by_month', (select jsonb_agg(coalesce(x.c, 0) order by g.m) from generate_series(1, 12) g(m)
        left join (select extract(month from visited_on)::int mm, count(*) c from mine group by 1) x on x.mm = g.m),
    'badges', coalesce((select jsonb_agg(jsonb_build_object('name', b.name, 'icon', b.icon) order by ub.earned_at)
        from public.user_badges ub join public.badges b on b.id = ub.badge_id
        where ub.user_id = auth.uid() and extract(year from ub.earned_at at time zone 'Asia/Kolkata') = p_year), '[]')
  ) end;
$$;

-- ---------------------------------------------------------------------------------------
-- P7-04: share cards. The owner creates a link on purpose; it stores a small snapshot (display
-- name and counts; never notes, photos, exact places visited or locations) and can be revoked.
-- Public reads go through a server route with the secret key, never a function anon can call.
-- ---------------------------------------------------------------------------------------
create table public.share_cards (
  token text primary key check (token ~ '^[A-Za-z0-9_-]{22,}$'),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('recap', 'badge', 'journey')),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index share_cards_user_idx on public.share_cards (user_id);
alter table public.share_cards enable row level security;
create policy share_cards_own on public.share_cards for select to authenticated using (user_id = auth.uid());
grant select on public.share_cards to authenticated;

create or replace function public.create_share_card(p_kind text, p_ref text default null)
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user(); snap jsonb; tok text; dname text;
begin
  select display_name into dname from public.profiles where id = uid;
  if (select count(*) from public.share_cards where user_id = uid and created_at >= private.ist_day_start()) >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if p_kind = 'recap' then
    -- Drop the named places: a public card shows counts, areas and cuisines only.
    snap := public.get_year_recap(coalesce(nullif(p_ref, '')::int,
              extract(year from now() at time zone 'Asia/Kolkata')::int)) - 'first' - 'favourite';
  elsif p_kind = 'badge' then
    select jsonb_build_object('name', b.name, 'icon', b.icon, 'description', b.description,
                              'earned_at', ub.earned_at)
      into snap
      from public.badges b join public.user_badges ub on ub.badge_id = b.id and ub.user_id = uid
     where b.slug = p_ref;
    if snap is null then raise exception 'forbidden' using errcode = 'P0001'; end if;
  elsif p_kind = 'journey' then
    select jsonb_build_object(
             'places', coalesce((select unique_places from public.user_scores where user_id = uid and period = 'all'), 0),
             'badges', (select count(*) from public.user_badges where user_id = uid))
      into snap;
    snap := snap || jsonb_build_object('level', private.level_for((snap->>'places')::int));
  else
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  tok := private.new_invite_code();
  insert into public.share_cards (token, user_id, kind, snapshot)
  values (tok, uid, p_kind, snap || jsonb_build_object('display_name', dname));
  return tok;
end $$;

create or replace function public.revoke_share_card(p_token text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user();
begin
  update public.share_cards set revoked_at = coalesce(revoked_at, now())
   where token = p_token and user_id = uid;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- P7-05: web push subscriptions and preferences
-- ---------------------------------------------------------------------------------------
create table public.push_subscriptions (
  endpoint text primary key check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  user_id uuid not null references public.profiles(id) on delete cascade,
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy push_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, delete on public.push_subscriptions to authenticated;
grant insert (endpoint, user_id, p256dh, auth) on public.push_subscriptions to authenticated;

-- Friend-verdict pushes are opt-in (requests and companion tags are always on once you allow
-- notifications at all).
alter table public.profiles add column notify_friend_verdicts boolean not null default false;
grant update (notify_friend_verdicts) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------------------
-- P7-07: privacy-respecting analytics and error log. No user ids, no notes, photos or
-- locations. Written only by a server route with the secret key; readable by admins.
-- ---------------------------------------------------------------------------------------
create table public.app_events (
  id bigint generated always as identity primary key,
  name text not null check (name ~ '^[a-z_]{2,40}$'),
  route text check (char_length(route) <= 80),
  device text check (device in ('phone', 'tablet', 'desktop')),
  created_at timestamptz not null default now()
);
create table public.app_errors (
  id bigint generated always as identity primary key,
  message text not null check (char_length(message) <= 300),
  digest text check (char_length(digest) <= 64),
  route text check (char_length(route) <= 80),
  source text not null check (source in ('client', 'server')),
  created_at timestamptz not null default now()
);
alter table public.app_events enable row level security;
alter table public.app_errors enable row level security;
create policy app_events_admin on public.app_events for select to authenticated using (private.is_admin());
create policy app_errors_admin on public.app_errors for select to authenticated using (private.is_admin());
grant select on public.app_events, public.app_errors to authenticated;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
grant execute on function public.get_year_recap(int), public.create_share_card(text, text),
  public.revoke_share_card(text) to authenticated;
revoke all on function public.hinglish_fold(text) from public, anon;
grant execute on function public.hinglish_fold(text) to authenticated, service_role;

-- Award newly possible badges.
do $$
declare u uuid;
begin
  for u in select id from public.profiles loop
    perform private.evaluate_badges(u);
  end loop;
end $$;
