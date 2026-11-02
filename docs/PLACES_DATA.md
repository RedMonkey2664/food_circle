# PLACES_DATA.md

Place identity is the foundation of scoring. Two spellings of one cafe must never become two points.

## 1. Principle

```
Your Place table (internal uuid)  <- scores, badges, visits point here
   |-- osm_id           optional link
   |-- google_place_id  optional link (off by default)
   |-- source: osm | google | user
```

A vendor changing pricing or terms must never break scores. Never use a vendor id as our primary key.

## 2. Sources and decisions

```
OpenStreetMap (Overpass)  seed Mumbai. Free, storable (ODbL, attribution required), patchy on small places.
User pin-drop             thelas, stalls, anything unlisted (Phase 5).
Google Places             OFF by default. See section 8.
Zomato / Swiggy           no public data API known; never scrape; link-out only (section 9).
Foursquare                not used in v1; check India coverage and terms before considering.
```

## 3. OSM seed (`pnpm seed:osm`, Phase 0)

Idempotent: upsert on `osm_id`; re-running updates names and tags but never deletes places that have visits.

Overpass query (adjust the bounding box after checking coverage; this covers Mumbai city and suburbs approximately):

```
[out:json][timeout:180];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream|bar|pub)$"](18.88,72.76,19.30,73.00);
  nwr["shop"~"^(bakery|confectionery|pastry)$"](18.88,72.76,19.30,73.00);
);
out center tags;
```

Be kind to Overpass: run once, cache the raw JSON in `data/` (gitignored), set a descriptive User-Agent, and do not loop the query.

Mapping:

```
amenity=cafe                              type cafe
amenity=restaurant|fast_food|food_court   type restaurant
amenity=ice_cream                         type restaurant, cuisine_tags += ice_cream
amenity=bar|pub                           type bar
shop=bakery|pastry                        type bakery
shop=confectionery                        type sweet_shop

diet:vegetarian=only   diet_flags += pure_veg
diet:vegetarian=yes    diet_flags += veg_options
diet:halal=yes|only    diet_flags += halal
(jain and egg are not standard OSM tags; they come from users or admins)

cuisine=*  split on ';' and lower_snake each value into cuisine_tags
           map known synonyms: indian->indian, irani->irani_cafe, south_indian|udupi->udupi,
           street_food->street_food, gujarati->gujarati_thali (only if the name or tags say thali)
```

Skip features without a name. Keep `name`, add `name:en` as an alias if different. Store `osm_id` as `node/123`, `way/456`, `relation/789`.

Brands: `brand` or `brand:wikidata` tags, else match the curated list in `data/brands.json` (Starbucks, McDonald's, Domino's, Subway, KFC, Pizza Hut, Burger King, Cafe Coffee Day, Barista, Haldiram's, Theobroma, Social, Wow Momo, Baskin Robbins, Naturals, Chaayos, Third Wave Coffee, Blue Tokai). Independents have `brand_id = null`. The chain cap relies on this, so keep the list editable and cheap to extend.

Report after the seed: total places, places per area, share with diet flags, share with cuisine tags, places with no area.

## 4. Areas

Goal: every pin resolves to a Mumbai area for logbook counts and area badges.

Strategy, in order of preference:
1. Polygons: load area or ward boundary GeoJSON into `areas.geom` (BMC ward boundaries and OSM suburb boundaries are candidates; check what is actually available and its licence).
2. Fallback: use OSM `place=suburb|neighbourhood` nodes as `areas.centroid` and assign each place to the nearest centroid within 3 km.

`resolve_area(geom)`:

```sql
create or replace function resolve_area(p geography) returns uuid
language sql stable set search_path = public, extensions as $$
  select coalesce(
    (select a.id from areas a where a.geom is not null and st_covers(a.geom, p::geometry) limit 1),
    (select a.id from areas a where a.centroid is not null
       and st_dwithin(a.centroid::geography, p, 3000)
     order by a.centroid::geography <-> p limit 1)
  );
$$;
```

Slugs are lowercase kebab: `bandra-west`, `andheri-east`, `colaba`, `fort`, etc. Group them under regions (`south-mumbai`, `western-suburbs`, `central-suburbs`, `harbour`) through `parent_id`, used by badges like South Bombay Soul and Suburb Surveyor. Document the exact slug list in docs/DECISIONS.md after the load.

## 5. Search (`search_places`)

Own table only (Phase 1). Results ranked by trigram similarity, prefix match, and a small proximity boost when the user shared location.

```sql
create or replace function search_places(
  p_query text, p_lat double precision default null, p_lng double precision default null, p_limit int default 20)
returns table (id uuid, name text, area_name text, type place_type, diet_flags text[],
               distance_m double precision, rank real)
language sql stable set search_path = public, extensions as $$
  with q as (
    select normalize_name(p_query) as nq,
           case when p_lat is null then null
                else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end as pt
  )
  select p.id, p.name, a.name, p.type, p.diet_flags,
         case when q.pt is null then null else st_distance(p.geom, q.pt) end as distance_m,
         (similarity(p.search_text, q.nq)
          + case when p.name_normalized like q.nq || '%' then 0.3 else 0 end
          + case when q.pt is null then 0
                 else greatest(0, 0.2 - st_distance(p.geom, q.pt) / 50000.0)::real end) as rank
  from places p
  cross join q
  left join areas a on a.id = p.area_id
  where p.status not in ('merged','closed')
    and length(q.nq) >= 2
    and (p.search_text % q.nq or p.search_text like '%' || q.nq || '%')
  order by rank desc
  limit least(p_limit, 50);
$$;
```

Add `set pg_trgm.similarity_threshold = 0.2` for the session or tune as needed. Each result should also carry a "N friends went" hint, which is computed client-side from `get_place_summary` for the visible results only.

## 6. Duplicate prevention (Phase 5, but write the function in Phase 0)

When a user adds a place (pin-drop or typed name), call `find_place_candidates` first.

```sql
create or replace function find_place_candidates(
  p_name text, p_lat double precision, p_lng double precision, p_radius_m int default 50)
returns table (id uuid, name text, area_name text, distance_m double precision,
               name_similarity real, status place_status)
language sql stable set search_path = public, extensions as $$
  with x as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as pt,
                    normalize_name(p_name) as nq)
  select p.id, p.name, a.name, st_distance(p.geom, x.pt), similarity(p.name_normalized, x.nq), p.status
  from places p
  cross join x
  left join areas a on a.id = p.area_id
  where p.status <> 'merged'
    and (
         (st_dwithin(p.geom, x.pt, greatest(p_radius_m, 1)) and similarity(p.name_normalized, x.nq) >= 0.3)
      or (st_dwithin(p.geom, x.pt, 200) and similarity(p.name_normalized, x.nq) >= 0.7)
    )
  order by similarity(p.name_normalized, x.nq) desc, st_distance(p.geom, x.pt)
  limit 5;
$$;
```

`create_place` RPC:

```
create_place(p_name, p_lat, p_lng, p_type, p_diet_flags, p_cuisine_tags, p_force boolean default false)
  - requires auth, applies the daily cap (20 places/day)
  - validates: name length, lat/lng inside a sane Mumbai-region box (reject far away points), type, flags
  - calls find_place_candidates; if candidates exist and p_force is false,
    returns { "status": "candidates", "candidates": [...] } and creates nothing
  - otherwise inserts the place (source 'user', status 'unverified', created_by = auth.uid())
    and returns { "status": "created", "place_id": ... }
```

UI: "Is this the same as X?" with the candidate list; choosing one uses the existing place; "No, it's different" calls again with `p_force = true`.

Status flow:
- `unverified` becomes `confirmed` once 2 different users have logged visits there (trigger `confirm_place_if_two_users`).
- Show an "unverified" hint on unverified places and let people confirm by logging; do not block logging.
- "Report closed or moved" writes to `place_suggestions` (field `closed` or `moved`); admin applies the change.

## 7. Merge tool (admin, Phase 5)

```sql
create or replace function merge_places(p_source uuid, p_target uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare u uuid;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_source = p_target then raise exception 'source and target are the same'; end if;
  if exists (select 1 from places where id in (p_source, p_target) and status = 'merged') then
    raise exception 'cannot merge an already merged place';
  end if;

  perform set_config('app.skip_recompute', 'on', true);   -- avoid per-row recompute storms
  update visits set place_id = p_target where place_id = p_source;

  update places t
     set aliases = (select array(select distinct x from unnest(t.aliases || s.aliases || array[s.name]) x
                                 where x is not null and x <> t.name))
    from places s
   where t.id = p_target and s.id = p_source;

  update places set status = 'merged', merged_into = p_target where id = p_source;

  insert into admin_audit (admin_id, action, target, details)
  values (auth.uid(), 'merge_places', p_target::text, jsonb_build_object('source', p_source));

  perform set_config('app.skip_recompute', 'off', true);
  for u in select distinct user_id from visits where place_id = p_target loop
    perform recompute_visit_flags(u);
  end loop;
end $$;
```

The merge page shows both places side by side (name, aliases, area, visit counts, distance), a preview of "N visits move, M users' scores change", and a confirm button. Place URLs of merged places redirect to `merged_into`.

## 8. Google Places (off by default)

Status: not part of v1. `GOOGLE_PLACES_ENABLED=false`.

Reason: as far as I know, Google's terms restrict storing most Places content (typically only the place_id may be kept indefinitely; coordinates may only be cached temporarily). Creating a permanent place with Google-provided coordinates may violate that. Verify the current terms and pricing before enabling anything.

If the human later enables it, the only acceptable pattern is: use autocomplete to help the user find the name, then have the user confirm the location by dropping a pin on the OSM map (our own coordinates), and store only `google_place_id` as a link. If that is not acceptable under the terms, do not enable it, and do not work around the restriction.

## 9. Swiggy / Zomato handoff (`lib/handoff.ts`)

There is no partner API we can rely on. The handoff is a plain link built from the place name and area that opens the vendor's search. It may land on a search page or a wrong restaurant, so the label is honest: "Find on Swiggy", "Find on Zomato".

Rules:
- Show the button only for types restaurant, cafe, bakery, sweet_shop; never for street stalls.
- Hide for unverified user-added places and for closed places.
- Controlled by flags `HANDOFF_SWIGGY_ENABLED` and `HANDOFF_ZOMATO_ENABLED`, both off until the human tests the link formats on real iOS and Android devices (deep link into the app vs mobile web) and fills in the URL templates in `lib/handoff.ts`.
- Open in a new tab with `rel="noopener noreferrer"`.
- Log the click (event only, no personal data) so we can measure whether the handoff is used.
- Do not scrape either site and do not call undocumented endpoints.

Template placeholders (the human must verify and fill; do not guess):

```ts
export const HANDOFF = {
  swiggy: (q: string) => `TODO_VERIFY_SWIGGY_SEARCH_URL?query=${encodeURIComponent(q)}`,
  zomato: (q: string) => `TODO_VERIFY_ZOMATO_SEARCH_URL?q=${encodeURIComponent(q)}`,
};
// q = `${place.name} ${area.name}`
```

## 10. Place page data needs

- Header: name, area name, type, diet badges (empty flags show "Diet info not available"; Phase 5 adds "Know this? Suggest" via `place_suggestions`).
- Admin can edit diet flags, cuisine tags, type, name, location (admin-only RPC `admin_update_place`, audited).
