-- Phase 6 (reworked at the human's request, 2026-11-03): achievements instead of leaderboards.
-- No boards, no ranking, no comparison. People unlock quirky badges for their own food life and
-- pin up to 3 of them on their profile (shown beside their name on verdict cards too).
-- Scoring flags from Phase 1 are unchanged; "counted" places still follow the daily/chain caps.
set search_path = public, extensions;

-- ---------------------------------------------------------------------------------------
-- Badges: an icon, secret badges, a 'fun'/'milestone' category
-- ---------------------------------------------------------------------------------------
alter table public.badges add column icon text not null default '🏅';
alter table public.badges add column is_secret boolean not null default false;
alter table public.badges add column sort int not null default 100;
alter table public.badges drop constraint badges_category_check;
alter table public.badges add constraint badges_category_check
  check (category in ('exploration','culture','behaviour','streak','fun','milestone'));

-- Profile showcase: up to 3 earned badges, in order.
create table public.profile_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  position smallint not null check (position between 1 and 3),
  primary key (user_id, badge_id),
  unique (user_id, position)
);
alter table public.profile_badges enable row level security;
-- Showcases are public to signed-in people who aren't blocked; writes only via RPC.
create policy profile_badges_select on public.profile_badges for select to authenticated
  using (not private.is_blocked_between(auth.uid(), user_id));
grant select on public.profile_badges to authenticated;

-- ---------------------------------------------------------------------------------------
-- Progress for one rule (JSON in badges.rule). Adding a badge needs no schema change.
-- ---------------------------------------------------------------------------------------
create or replace function private.level_for(p_places int) returns int
language sql immutable as $$ select floor(sqrt(greatest(coalesce(p_places, 0), 0)))::int $$;

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
    else
      return 0;
  end case;
  return coalesce(n, 0);
end $$;

create or replace function private.evaluate_badges(p_user uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare b record;
begin
  if p_user is null then return; end if;
  for b in
    select bd.id, bd.rule from public.badges bd
    where bd.is_active
      and not exists (select 1 from public.user_badges ub where ub.user_id = p_user and ub.badge_id = bd.id)
  loop
    if private.badge_progress(p_user, b.rule) >= coalesce((b.rule->>'threshold')::int, 1) then
      insert into public.user_badges (user_id, badge_id) values (p_user, b.id) on conflict do nothing;
    end if;
  end loop;
end $$;

-- Re-evaluate when the things achievements look at change (visits already re-evaluate through
-- recompute_visit_flags). First-among-friends also re-checks friends who were there earlier.
create or replace function private.trg_badges_for_owner() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid;
begin
  if current_setting('app.skip_recompute', true) = 'on' then return null; end if;
  -- Read the row as JSON: each watched table has a different owner column.
  uid := case tg_table_name
    when 'want_to_go' then (to_jsonb(new)->>'user_id')::uuid
    when 'places' then (to_jsonb(new)->>'created_by')::uuid
    else (select v.user_id from public.visits v where v.id = (to_jsonb(new)->>'visit_id')::uuid) end;
  perform private.evaluate_badges(uid);
  return null;
end $$;

create trigger badges_on_photo after insert on public.visit_photos
  for each row execute function private.trg_badges_for_owner();
create trigger badges_on_dish after insert on public.review_dishes
  for each row execute function private.trg_badges_for_owner();
create trigger badges_on_review after insert or update of note, price_per_head on public.reviews
  for each row execute function private.trg_badges_for_owner();
create trigger badges_on_want after insert on public.want_to_go
  for each row execute function private.trg_badges_for_owner();
create trigger badges_on_place_added after insert on public.places
  for each row when (new.created_by is not null) execute function private.trg_badges_for_owner();

create or replace function private.trg_visits_badges_for_friends() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare f uuid;
begin
  if current_setting('app.skip_recompute', true) = 'on' then return null; end if;
  for f in
    select distinct v.user_id from public.visits v
    where v.place_id = new.place_id and v.user_id <> new.user_id and v.logged_at < new.logged_at
      and private.are_friends(v.user_id, new.user_id)
  loop
    perform private.evaluate_badges(f);
  end loop;
  return null;
end $$;
create trigger visits_badges_for_friends after insert on public.visits
  for each row execute function private.trg_visits_badges_for_friends();

-- ---------------------------------------------------------------------------------------
-- The achievements (names and copy live here so they ship as data). Upsert by slug.
-- ---------------------------------------------------------------------------------------
insert into public.badges (slug, name, description, category, rule, icon, is_secret, sort, is_active) values
  -- Milestones
  ('first-bite', 'First Bite', 'Logged your very first place. The diary has begun, and so has the snacking.', 'milestone', '{"type":"total_places","threshold":1}', '🍽️', false, 1, true),
  ('ten-plates', 'Ten Plates Deep', 'Ten different places. You are officially a person who "knows a spot".', 'milestone', '{"type":"total_places","threshold":10}', '🥢', false, 2, true),
  ('half-century', 'Half Century of Hunger', '50 different places. Sachin would be proud. Your stomach, less so.', 'milestone', '{"type":"total_places","threshold":50}', '🏏', false, 3, true),
  ('hundred-plates', 'The Hundred Plate Club', '100 different places. At this point Mumbai should be paying you.', 'milestone', '{"type":"total_places","threshold":100}', '💯', false, 4, true),
  -- Cafes, bakeries, sweets, bars, stalls
  ('bean-there', 'Bean There, Done That', 'Five different cafes. Your blood type is now cold brew.', 'exploration', '{"type":"unique_places_of_type","place_type":"cafe","threshold":5}', '☕', false, 10, true),
  ('caffeine-cartographer', 'Caffeine Cartographer', '20 cafes mapped. Baristas whisper your name. Wi-Fi passwords fear you.', 'exploration', '{"type":"unique_places_of_type","place_type":"cafe","threshold":20}', '🗺️', false, 11, true),
  ('thela-hunter', 'Thela Whisperer', '10 street stalls. You can smell good chutney from across the road.', 'culture', '{"type":"unique_places_of_type","place_type":"street_stall","threshold":10}', '🛺', false, 12, true),
  ('crumb-collector', 'Crumb Collector', 'Five bakeries. You leave a trail of crumbs wherever you go, like a well-fed Hansel.', 'exploration', '{"type":"unique_places_of_type","place_type":"bakery","threshold":5}', '🥐', false, 13, true),
  ('mithai-mafia', 'Mithai Mafia', 'Five sweet shops. You do not ask for "a little". You ask for "half kilo".', 'culture', '{"type":"unique_places_of_type","place_type":"sweet_shop","threshold":5}', '🍬', false, 14, true),
  ('happy-hour-historian', 'Happy Hour Historian', 'Five bars logged, responsibly, with a diary as proof.', 'exploration', '{"type":"unique_places_of_type","place_type":"bar","threshold":5}', '🍻', false, 15, true),
  -- Taste and money
  ('fine-diner', 'The Fine Diner', 'Three meals at Rs 1,500+ a head. Pinky up, napkin on lap, bill hidden from parents.', 'fun', '{"type":"price_at_least","amount":1500,"threshold":3}', '🥂', false, 20, true),
  ('pocket-change-gourmet', 'Pocket Change Gourmet', 'Ten meals at Rs 150 or less a head. Michelin who? You have a vada pav budget and a dream.', 'fun', '{"type":"price_at_most","amount":150,"threshold":10}', '🪙', false, 21, true),
  ('random-taste', 'Random Taste Generator', 'Eight different cuisines. Your taste buds have no fixed address.', 'fun', '{"type":"unique_cuisines","threshold":8}', '🎲', false, 22, true),
  ('cuisine-chaos-agent', 'Cuisine Chaos Agent', '15 cuisines. Momos for breakfast, sushi for lunch, misal for dinner. Respect.', 'fun', '{"type":"unique_cuisines","threshold":15}', '🌀', false, 23, true),
  ('pure-veg-pilgrim', 'Pure Veg Pilgrim', 'Ten pure veg places. Paneer is not a personality, but on you it works.', 'culture', '{"type":"diet_places","flag":"pure_veg","threshold":10}', '🥬', false, 24, true),
  ('chain-breaker', 'Chain Breaker', 'Ten independent places, no franchises. Small kitchens, big flavour, zero loyalty cards.', 'fun', '{"type":"independent_places","threshold":10}', '⛓️', false, 25, true),
  ('vada-pav-veteran', 'Vada Pav Veteran', 'Vada pav at ten different places. You have opinions about the chutney and you will share them.', 'culture', '{"type":"unique_places_with_cuisine","cuisine_tag":"vada_pav","threshold":10}', '🍔', false, 26, true),
  ('irani-chai-regular', 'Bun Maska Bureaucrat', 'Five Irani cafes. You read the "No combing hair" sign and felt seen.', 'culture', '{"type":"unique_places_with_cuisine","cuisine_tag":"irani_cafe","threshold":5}', '🫖', false, 27, true),
  ('udupi-uncle', 'Udupi Uncle', 'Five Udupi places. "One set dosa, extra chutney, filter coffee strong." Said with authority.', 'culture', '{"type":"unique_places_with_cuisine","cuisine_tag":"udupi","threshold":5}', '🥥', false, 28, true),
  -- Places
  ('bandra-native', 'Bandra Native', '20 places across Bandra. You now say "Bandra West" like it is a lifestyle.', 'exploration', '{"type":"unique_places_in_areas","area_slugs":["bandra-west","bandra-east"],"threshold":20}', '🌊', false, 30, true),
  ('south-bombay-soul', 'SoBo Soul', '15 places in South Mumbai. You still call it Bombay and nobody corrects you.', 'exploration', '{"type":"unique_places_in_region","region_slug":"south-mumbai","threshold":15}', '🏛️', false, 31, true),
  ('suburb-surveyor', 'Suburb Surfer', 'Ate in five different suburbs. The local train is your tasting menu.', 'exploration', '{"type":"unique_areas","kind":"suburb","threshold":5}', '🚆', false, 32, true),
  ('pin-code-hopper', 'Pin Code Hopper', 'Fifteen different neighbourhoods. Your Google Maps timeline needs a nap.', 'exploration', '{"type":"unique_areas","threshold":15}', '📮', false, 33, true),
  ('line-changer', 'All Lines Lead to Lunch', 'Ate in all four corners: Town, Western, Central and Harbour. Mumbai, completed.', 'exploration', '{"type":"regions_covered","threshold":4}', '🧭', false, 34, true),
  ('map-maker', 'Map Maker', 'Put three places on the map yourself. Somewhere a thela owner is famous because of you.', 'fun', '{"type":"places_added","threshold":3}', '📍', false, 35, true),
  -- Verdicts and writing
  ('honest-critic', 'Brutally Honest Bhai', 'At least five Gos and five Skips. Your friends trust you because you have said no before.', 'behaviour', '{"type":"skip_and_go_balance","threshold":5}', '⚖️', false, 40, true),
  ('skip-lord', 'Skip Lord', 'Ten Skips. Your standards are higher than Antilia.', 'behaviour', '{"type":"verdict_count","verdict":"skip","threshold":10}', '🙅', false, 41, true),
  ('only-for-oracle', 'The "Only For" Oracle', 'Five "Only for" verdicts. You know exactly which one dish makes the trip worth it.', 'behaviour', '{"type":"verdict_count","verdict":"only_for","threshold":5}', '🔮', false, 42, true),
  ('first-finder', 'First Finder', 'Got to three places before any of your friends did. Certified trendsetter.', 'behaviour', '{"type":"first_among_friends","threshold":3}', '🚩', false, 43, true),
  ('menu-archaeologist', 'Menu Archaeologist', 'Rated 15 dishes. You dig through menus like they hide ancient treasure.', 'fun', '{"type":"dish_verdicts","threshold":15}', '🦴', false, 44, true),
  ('shutterbug-snacker', 'Shutterbug Snacker', 'Ten food photos. The food got cold, but the content is hot.', 'fun', '{"type":"photos","threshold":10}', '📸', false, 45, true),
  ('diary-poet', 'Diary Poet', 'Five notes written. Somewhere a paratha is reading your review and blushing.', 'fun', '{"type":"notes","threshold":5}', '✍️', false, 46, true),
  ('wishlist-hoarder', 'Wishlist Hoarder', '20 places on Want to go. Ambitious. Optimistic. Slightly unrealistic. We love it.', 'fun', '{"type":"want_to_go","threshold":20}', '📌', false, 47, true),
  -- Habits and secrets
  ('weekly-wanderer', 'Weekly Wanderer', 'A new place four weeks running. Routine? Never heard of her.', 'streak', '{"type":"streak_weeks","threshold":4}', '🔥', false, 50, true),
  ('night-owl', 'Night Owl Nibbler', 'Logged five new places between 11 pm and 4 am. The city sleeps; you snack.', 'fun', '{"type":"logged_between","from":23,"to":4,"threshold":5}', '🦉', true, 60, true),
  ('sunrise-snacker', 'Sunrise Snacker', 'Logged five new places before 9 am. Poha and chai before the world wakes up.', 'fun', '{"type":"logged_between","from":5,"to":9,"threshold":5}', '🌅', true, 61, true),
  ('same-again-bhaiya', 'Same Again, Bhaiya', 'Went back to one place five times. They know your order. You are basically family.', 'fun', '{"type":"same_place_visits","threshold":5}', '🔁', true, 62, true)
on conflict (slug) do update
  set name = excluded.name, description = excluded.description, category = excluded.category,
      rule = excluded.rule, icon = excluded.icon, is_secret = excluded.is_secret, sort = excluded.sort,
      is_active = excluded.is_active;

-- Still waiting for data we don't have yet (Phase 7): keep inactive, but give them style too.
update public.badges set icon = '🤝', sort = 90 where slug = 'trusted-taster';
update public.badges set icon = '👨‍👩‍👧', sort = 91 where slug = 'family-table';
update public.badges set icon = '🚉', sort = 92 where slug = 'local-train-foodie';
update public.badges set is_active = false where slug = 'thali-master';

-- ---------------------------------------------------------------------------------------
-- Reads
-- ---------------------------------------------------------------------------------------

-- Every achievement for me (earned, locked with progress, secret ones masked until earned),
-- or only the earned ones for someone else.
create or replace function public.get_achievements(p_user uuid)
returns table (slug text, name text, description text, icon text, category text, threshold int,
               progress int, earned_at timestamptz, is_secret boolean, showcased smallint)
language sql stable security definer set search_path = public, extensions as $$
  select b.slug,
         case when b.is_secret and ub.earned_at is null then '???' else b.name end,
         case when b.is_secret and ub.earned_at is null then 'A secret achievement. Keep eating, it will find you.'
              else b.description end,
         case when b.is_secret and ub.earned_at is null then '❔' else b.icon end,
         b.category,
         coalesce((b.rule->>'threshold')::int, 1),
         case when p_user = auth.uid() and ub.earned_at is null and not b.is_secret
              then least(private.badge_progress(p_user, b.rule), coalesce((b.rule->>'threshold')::int, 1))
              else null end,
         ub.earned_at, b.is_secret, pb.position
  from public.badges b
  left join public.user_badges ub on ub.badge_id = b.id and ub.user_id = p_user
  left join public.profile_badges pb on pb.badge_id = b.id and pb.user_id = p_user
  where auth.uid() is not null
    and not private.is_blocked_between(auth.uid(), p_user)
    and b.is_active
    and (p_user = auth.uid() or ub.earned_at is not null)
  order by (ub.earned_at is null), b.sort, b.name;
$$;

-- Pinned badges for many people at once (profile headers and verdict cards).
create or replace function public.get_showcases(p_users uuid[])
returns table (user_id uuid, slug text, name text, icon text, slot smallint)
language sql stable security definer set search_path = public, extensions as $$
  select pb.user_id, b.slug, b.name, b.icon, pb.position
  from public.profile_badges pb join public.badges b on b.id = pb.badge_id
  where pb.user_id = any (p_users[1:200]) and auth.uid() is not null
    and not private.is_blocked_between(auth.uid(), pb.user_id)
  order by pb.user_id, pb.position;
$$;

-- Choose up to 3 earned badges to show off (order = position). Empty array clears it.
create or replace function public.set_showcase(p_slugs text[]) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := private.require_active_user(); i int := 0; s text; bid uuid;
begin
  if cardinality(coalesce(p_slugs, '{}')) > 3 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  delete from public.profile_badges where user_id = uid;
  foreach s in array coalesce(p_slugs, '{}') loop
    select b.id into bid from public.badges b
      join public.user_badges ub on ub.badge_id = b.id and ub.user_id = uid
     where b.slug = s;
    if bid is null then raise exception 'forbidden' using errcode = 'P0001', detail = 'not earned'; end if;
    i := i + 1;
    insert into public.profile_badges (user_id, badge_id, position) values (uid, bid, i)
    on conflict (user_id, badge_id) do nothing;
  end loop;
end $$;

-- My own journey (personal only; never compared with anyone).
create or replace function public.get_my_progress()
returns table (all_time int, this_month int, level int, current_streak int, best_streak int,
               in_grace boolean, badges_earned int, badges_total int)
language sql stable security definer set search_path = public, extensions as $$
  with me as (select auth.uid() as id),
  month_start as (select date_trunc('month', now() at time zone 'Asia/Kolkata')::date as d)
  select coalesce((select unique_places from public.user_scores s where s.user_id = me.id and s.period = 'all'), 0),
         coalesce((select unique_places from public.user_scores s, month_start m
                    where s.user_id = me.id and s.period = 'month' and s.period_start = m.d), 0),
         private.level_for(coalesce((select unique_places from public.user_scores s
                                      where s.user_id = me.id and s.period = 'all'), 0)),
         coalesce(st.current_streak, 0), coalesce(st.best_streak, 0),
         coalesce(st.current_streak, 0) > 0 and st.last_active_week <
           ((now() at time zone 'Asia/Kolkata')::date
            - (extract(isodow from (now() at time zone 'Asia/Kolkata')::date)::int - 1)) - 7,
         (select count(*)::int from public.user_badges ub join public.badges b on b.id = ub.badge_id
           where ub.user_id = me.id and b.is_active),
         (select count(*)::int from public.badges where is_active)
  from me left join public.user_streaks st on st.user_id = me.id
  where me.id is not null;
$$;

-- After logging: was it a new place, and which achievements did it just unlock?
create or replace function public.get_visit_feedback(p_visit uuid)
returns table (reason text, unlocked jsonb)
language plpgsql stable security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); v public.visits%rowtype; why text; un jsonb;
begin
  select * into v from public.visits where id = p_visit and user_id = uid;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  why := case
    when v.counts_all_time then 'new_place'
    when not v.is_first_visit then 'repeat'
    else 'capped' end;
  select coalesce(jsonb_agg(jsonb_build_object('name', b.name, 'icon', b.icon, 'description', b.description)
                            order by b.sort), '[]'::jsonb)
    into un
    from public.user_badges ub join public.badges b on b.id = ub.badge_id
   where ub.user_id = uid and ub.earned_at >= v.logged_at - interval '5 seconds';
  return query select why, un;
end $$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
grant execute on function public.get_achievements(uuid), public.get_showcases(uuid[]),
  public.set_showcase(text[]), public.get_my_progress(), public.get_visit_feedback(uuid)
  to authenticated;

-- Award what people have already earned.
do $$
declare u uuid;
begin
  for u in select id from public.profiles loop
    perform private.evaluate_badges(u);
  end loop;
end $$;
