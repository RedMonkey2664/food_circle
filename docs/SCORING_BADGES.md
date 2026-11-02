# SCORING_BADGES.md

The Visit is the unit that scores. Reviews, dishes, notes and photos earn nothing. Scoring lives in one place: the SQL functions below. The app never computes points itself.

## 1. Rules

1. Score = number of distinct places with at least one counted visit, per period.
2. First visit only. Repeat visits go to the diary and earn nothing.
3. Only a counted visit scores. A visit is counted when it passes every rule below, evaluated in the order the visits were logged (`logged_at`, then `id`).
4. Daily cap: at most 5 newly counted places per `visited_on` day.
5. Chain cap: at most 3 counted outlets per brand per calendar month (by `visited_on`). Independents (`brand_id` null) are uncapped.
6. Backdated visits (visited_on earlier than the IST day before the day it was logged) count toward all-time only, never toward weekly or monthly boards.
7. Extra reviews, edits, dishes, photos: no points. Deleting a review changes nothing; deleting a visit removes its point and the flags are recomputed.
8. Verified visits (device location near the pin) get a checkmark and break ties on boards. Unverified visits still count.
9. Companion tagging gives no points. The tagged friend gets "Add to your log?" and logs their own visit.
10. Leaderboards use `unique_places_shared` (counted visits with visibility not private). A user always sees their full score on their own profile.
11. Scores are recomputed from raw visits; there are no manual increments. Any rule change is a recompute, so every rule change needs a test.

Why logged order: a backdated entry for a place you already logged is a repeat, which is predictable and cannot steal a point from your recent visit.

Periods: week starts Monday (IST), month is the calendar month, all-time is everything. `period_start` for all-time is 1970-01-01.

Edge cases to handle and test:
- Merging places: visits move to the surviving place; flags recompute; nobody keeps double credit.
- Place merged into another that the user already visited: the second becomes a repeat.
- Changing a visit's `visited_on` or `visibility`: recompute.
- Clock: use IST for "today" and for month boundaries.

## 2. The recompute function (migration 0010)

```sql
create or replace function recompute_visit_flags(p_user uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  r record;
  seen uuid[] := '{}';
  day_counts jsonb := '{}'::jsonb;     -- '2026-10-14' -> n
  brand_month jsonb := '{}'::jsonb;    -- '<brand uuid>|2026-10' -> n
  v_first boolean; v_backdated boolean; v_counts boolean;
  v_day text; v_bm text; v_logged_ist date;
begin
  for r in
    select v.id, v.place_id, v.visited_on, v.logged_at, p.brand_id
    from visits v join places p on p.id = v.place_id
    where v.user_id = p_user
    order by v.logged_at, v.id
  loop
    v_first := not (r.place_id = any(seen));
    if v_first then seen := seen || r.place_id; end if;

    v_logged_ist := (r.logged_at at time zone 'Asia/Kolkata')::date;
    v_backdated := r.visited_on < v_logged_ist - 1;

    v_counts := false;
    if v_first then
      v_day := r.visited_on::text;
      if coalesce((day_counts->>v_day)::int, 0) < 5 then
        if r.brand_id is null then
          v_counts := true;
        else
          v_bm := r.brand_id::text || '|' || to_char(r.visited_on, 'YYYY-MM');
          if coalesce((brand_month->>v_bm)::int, 0) < 3 then
            brand_month := jsonb_set(brand_month, array[v_bm],
                                     to_jsonb(coalesce((brand_month->>v_bm)::int, 0) + 1));
            v_counts := true;
          end if;
        end if;
        if v_counts then
          day_counts := jsonb_set(day_counts, array[v_day],
                                  to_jsonb(coalesce((day_counts->>v_day)::int, 0) + 1));
        end if;
      end if;
    end if;

    update visits
       set is_first_visit = v_first,
           is_backdated = v_backdated,
           counts_all_time = v_counts,
           counts_in_periods = (v_counts and not v_backdated)
     where id = r.id
       and (is_first_visit, is_backdated, counts_all_time, counts_in_periods)
           is distinct from (v_first, v_backdated, v_counts, (v_counts and not v_backdated));
  end loop;

  perform refresh_user_scores(p_user);
  perform refresh_user_streak(p_user);
  perform evaluate_badges(p_user);          -- Phase 6; stub earlier
end $$;
```

Trigger on visits (after insert, after delete, after update of user_id, place_id, visited_on, visibility). The flag updates inside the function must not retrigger it, and bulk operations can switch it off:

```sql
create or replace function trg_visits_recompute() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if current_setting('app.skip_recompute', true) = 'on' then
    return null;
  end if;
  if tg_op = 'DELETE' then
    perform recompute_visit_flags(old.user_id);
  else
    perform recompute_visit_flags(new.user_id);
    if tg_op = 'UPDATE' and old.user_id <> new.user_id then
      perform recompute_visit_flags(old.user_id);
    end if;
  end if;
  return null;
end $$;

create trigger visits_recompute
  after insert or delete or update of user_id, place_id, visited_on, visibility on visits
  for each row execute function trg_visits_recompute();
```

(`update of` lists columns, so the flag columns updated inside the function do not fire the trigger.)

## 3. Score cache

```sql
create or replace function refresh_user_scores(p_user uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from user_scores where user_id = p_user;

  -- all time
  insert into user_scores (user_id, period, period_start,
                           unique_places, unique_places_shared, unique_areas, unique_cuisines)
  select p_user, 'all', date '1970-01-01',
         count(distinct v.place_id),
         count(distinct v.place_id) filter (where v.visibility <> 'private'),
         count(distinct p.area_id),
         count(distinct c.cuisine)
  from visits v
  join places p on p.id = v.place_id
  left join lateral unnest(p.cuisine_tags) as c(cuisine) on true
  where v.user_id = p_user and v.counts_all_time
  having count(*) > 0;

  -- weekly and monthly (non-backdated only)
  insert into user_scores (user_id, period, period_start,
                           unique_places, unique_places_shared, unique_areas, unique_cuisines)
  select p_user, per.period, per.pstart,
         count(distinct v.place_id),
         count(distinct v.place_id) filter (where v.visibility <> 'private'),
         count(distinct p.area_id),
         count(distinct c.cuisine)
  from visits v
  join places p on p.id = v.place_id
  left join lateral unnest(p.cuisine_tags) as c(cuisine) on true
  cross join lateral (values
      ('week'::score_period,  date_trunc('week',  v.visited_on)::date),
      ('month'::score_period, date_trunc('month', v.visited_on)::date)
  ) as per(period, pstart)
  where v.user_id = p_user and v.counts_in_periods
  group by per.period, per.pstart;
end $$;
```

## 4. Leaderboards

RPC `get_leaderboard(p_scope text, p_group uuid default null, p_period score_period default 'month', p_period_start date default null)`:

```
p_scope = 'friends'    the viewer + their accepted friends
p_scope = 'group'      members of p_group (viewer must be a member and the group's
                       leaderboard_enabled must be true)
p_scope = 'following'  the viewer + people they follow (opt-in in settings)
```

Rules:
- Rank by `unique_places_shared` desc, then verified-visit count desc, then earliest `updated_at`.
- Exclude users who blocked or are blocked by the viewer. Exclude users who have opted out of leaderboards (add `profiles.leaderboards_opt_in boolean default true`).
- Default `p_period_start` is the current IST week or month.
- No Mumbai-wide or global scope exists. Do not add one.
- Group boards are off by default and for Family-type groups stay off unless the owner enables them.
- Return rank, user, score, delta to the person above ("Beat Aarav: 4 more places").

## 5. Streaks (weekly new-place streak with a grace week)

A week is active if the user has at least one place with `counts_in_periods = true` and `visited_on` in that Monday-to-Sunday week (IST).

`refresh_user_streak(p_user)`:
1. List active weeks ascending.
2. Walk the weeks. A gap of exactly one missed week between two active weeks is forgiven (grace) and does not break the streak and does not add to its length. A gap of two or more missed weeks resets the streak.
3. The current week in progress never breaks a streak. The streak is "current" if the last active week is this week or last week (or the week before it when grace applies).
4. Store `current_streak`, `best_streak`, `last_active_week` in `user_streaks`.

Copy: gentle, never guilt. "6 weeks of new places" with a grace indicator, never "you lost your streak".

## 6. Badges

Badges are rows in `badges` with a JSON rule; adding a badge needs no schema change. `evaluate_badges(p_user)` is a plpgsql function that loops active badges, evaluates each rule type below, inserts into `user_badges` on first success (never removes). Visible rules use counted visits unless noted.

Rule types:

```json
{"type":"unique_places_in_areas","area_slugs":["bandra-west","bandra-east"],"threshold":20}
{"type":"unique_areas","kind":"suburb","threshold":5}
{"type":"unique_places_in_region","region_slug":"south-mumbai","threshold":15}
{"type":"unique_places_with_cuisine","cuisine_tag":"vada_pav","threshold":10}
{"type":"unique_places_of_type","place_type":"street_stall","threshold":10}
{"type":"first_among_friends","threshold":3}
{"type":"skip_and_go_balance","min_skip":5,"min_go":5}
{"type":"friends_acted_on_go","window_days":30,"threshold":5}
{"type":"family_visits","threshold":5}
{"type":"streak_weeks","threshold":6}
{"type":"near_stations","threshold":10}
```

Phase 6 set (data already available):

```
Bandra Native        unique_places_in_areas  Bandra areas, 20
Suburb Surveyor      unique_areas kind suburb, 5
Thela Hunter         unique_places_of_type street_stall, 10
First Finder         first_among_friends, 3
Honest Critic        skip_and_go_balance, 5 skips and 5 goes
```

Phase 7 set:

```
South Bombay Soul    unique_places_in_region south-mumbai, 15
Vada Pav Veteran     unique_places_with_cuisine vada_pav, 10
Irani Chai Regular   unique_places_with_cuisine irani_cafe, 5
Thali Master         unique_places_with_cuisine gujarati_thali, 5
Trusted Taster       friends_acted_on_go, 5
Family Table         family_visits, 5 (visits with a companion who is in the user's Family group)
Local Train Foodie   near_stations, 10 (needs railway station coordinates from OSM railway=station)
```

Definitions:
- first_among_friends: places where the user's counted visit is the earliest among the user and their accepted friends, and at least one friend logged it later.
- friends_acted_on_go: a friend's first visit to a place within the window after the user's Go verdict there, and the friend had no earlier visit. Counts friends more than strangers because only friends are considered. This is a proxy; we cannot know they saw the verdict.
- Behaviour badges (First Finder, Honest Critic, Trusted Taster) never appear on leaderboards; they are credibility signals shown beside the name on verdict cards and on profiles.
- Badge display: profile shows level, badges and counts; verdict cards show at most 2 badges beside the name.

Level: derive from all-time `unique_places`: Level = floor(sqrt(unique_places)) as a simple starting curve, shown as "Level 4 Explorer". Tunable; keep the formula in one function.

## 7. Anti-cheat (what exists, and what does not)

Exists: unique-place scoring, daily cap, chain cap, backdating excluded from periodic boards, optional verified visits, friend-scoped boards, reports.

Does not exist: fake visits cannot be fully prevented. In a friends-only circle the social cost of lying is the main defence, which is why there is no global board. Do not add a global board to "fix" engagement.

## 8. Post-log feedback

After a visit is saved, the client reads the new row's `counts_all_time`, `counts_in_periods` and, if boards are enabled, calls `get_leaderboard` once to show: "New place! +1. This month: 12. Aarav is 2 ahead of you." If the visit did not count, show a neutral reason ("Already logged before", "Daily limit reached", "Chain limit this month", "Added to your all-time log only").

## 9. Tests required

Unit tests in pgTAP: repeat visits, daily cap boundary (5 vs 6), chain cap (3 vs 4 in one month and reset next month), backdating threshold (yesterday vs 2 days ago), delete visit recompute, merge recompute, private visits excluded from leaderboard but included in own score, leaderboard excludes blocked users, group leaderboard requires membership.
