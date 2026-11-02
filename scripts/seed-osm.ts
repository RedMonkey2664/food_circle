/**
 * pnpm seed:osm [--refresh] [--dry-run]
 *
 * Imports Mumbai food places and areas from OpenStreetMap (PLACES_DATA.md §3-4).
 * Idempotent: upserts on areas.slug, brands.slug and places.osm_id; never deletes anything.
 * Overpass etiquette: one query per dataset, cached in data/raw/ (gitignored), descriptive UA.
 * Uses the secret key (bypasses RLS): run only from a trusted machine.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  REGIONS,
  dedupeAreas,
  toAreaRow,
  toPlaceRow,
  type BrandDef,
  type OsmElement,
  type PlaceRow,
} from './osm/transform';

loadEnv({ path: '.env.local' });

const BBOX = '18.88,72.76,19.30,73.00'; // south,west,north,east: Mumbai city + suburbs (approx.)
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RAW_DIR = join('data', 'raw');
const args = new Set(process.argv.slice(2));
const REFRESH = args.has('--refresh');
const DRY_RUN = args.has('--dry-run');

const QUERIES = {
  places: `[out:json][timeout:180];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream|bar|pub)$"](${BBOX});
  nwr["shop"~"^(bakery|confectionery|pastry)$"](${BBOX});
);
out center tags;`,
  areas: `[out:json][timeout:120];
nwr["place"~"^(suburb|neighbourhood)$"](${BBOX});
out center tags;`,
};

function userAgent(): string {
  const contact = process.env.OSM_SEED_CONTACT || 'https://github.com/RedMonkey2664/food_circle';
  return `FoodCircleSeed/0.1 (+${contact})`;
}

async function fetchOverpass(name: keyof typeof QUERIES): Promise<OsmElement[]> {
  const file = join(RAW_DIR, `osm-${name}.json`);
  if (!REFRESH && existsSync(file)) {
    console.log(`  using cached ${file}`);
    return (JSON.parse(readFileSync(file, 'utf8')) as { elements: OsmElement[] }).elements;
  }
  console.log(`  querying Overpass for ${name} (one request, may take a minute)...`);
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'User-Agent': userAgent(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: QUERIES[name] }).toString(),
  });
  if (!res.ok) throw new Error(`Overpass ${name} failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { elements: OsmElement[] };
  mkdirSync(RAW_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(json));
  return json.elements;
}

const point = (lat: number, lng: number) => `SRID=4326;POINT(${lng} ${lat})`;

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function main() {
  console.log('1/4 Fetching OSM data');
  const [placeEls, areaEls] = await Promise.all([fetchOverpass('places'), fetchOverpass('areas')]);

  const brands = JSON.parse(readFileSync(join('data', 'brands.json'), 'utf8')) as BrandDef[];
  const places = placeEls
    .map((el) => toPlaceRow(el, brands))
    .filter((p): p is PlaceRow => p !== null);
  const areas = dedupeAreas(areaEls.map(toAreaRow).filter((a) => a !== null));
  console.log(`  ${places.length} named food places, ${areas.length} areas`);
  if (DRY_RUN) return;

  const db = adminClient();

  console.log('2/4 Upserting regions and areas');
  const { data: regionRows, error: regionErr } = await db
    .from('areas')
    .upsert(
      Object.entries(REGIONS).map(([slug, name]) => ({ slug, name, kind: 'region' })),
      { onConflict: 'slug' },
    )
    .select('id, slug');
  if (regionErr) throw regionErr;
  const regionId = new Map(regionRows.map((r) => [r.slug as string, r.id as string]));

  for (const batch of chunks(areas, 500)) {
    const { error } = await db.from('areas').upsert(
      batch.map((a) => ({
        slug: a.slug,
        name: a.name,
        kind: a.kind,
        parent_id: a.region ? (regionId.get(a.region) ?? null) : null,
        centroid: point(a.lat, a.lng),
      })),
      { onConflict: 'slug' },
    );
    if (error) throw error;
  }

  console.log('3/4 Upserting brands and places');
  const brandList = [
    ...new Map(places.flatMap((p) => (p.brand ? [[p.brand.slug, p.brand]] : []))).values(),
  ];
  const brandId = new Map<string, string>();
  for (const batch of chunks(brandList, 500)) {
    const { data, error } = await db
      .from('brands')
      .upsert(batch, { onConflict: 'slug' })
      .select('id, slug');
    if (error) throw error;
    for (const b of data) brandId.set(b.slug as string, b.id as string);
  }

  // Existing osm ids: new rows are inserted as confirmed; existing rows only get name/tags
  // refreshed. Their stored location is sent back unchanged (the upsert's insert tuple needs a
  // non-null geom), so admin decisions (location, area, merged, closed) are never overwritten.
  const existing = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('places')
      .select('osm_id, geom')
      .not('osm_id', 'is', null)
      .order('osm_id')
      .range(from, from + 999);
    if (error) throw error;
    for (const r of data) existing.set(r.osm_id as string, r.geom as string);
    if (data.length < 1000) break;
  }

  const toRow = (p: PlaceRow) => ({
    osm_id: p.osm_id,
    name: p.name,
    aliases: p.aliases,
    type: p.type,
    diet_flags: p.diet_flags,
    cuisine_tags: p.cuisine_tags,
    brand_id: p.brand ? (brandId.get(p.brand.slug) ?? null) : null,
    source: 'osm',
  });

  const fresh = places.filter((p) => !existing.has(p.osm_id));
  const known = places.filter((p) => existing.has(p.osm_id));
  for (const batch of chunks(fresh, 500)) {
    const { error } = await db
      .from('places')
      .insert(batch.map((p) => ({ ...toRow(p), geom: point(p.lat, p.lng), status: 'confirmed' })));
    if (error) throw error;
  }
  for (const batch of chunks(known, 500)) {
    const { error } = await db.from('places').upsert(
      batch.map((p) => ({ ...toRow(p), geom: existing.get(p.osm_id) })),
      { onConflict: 'osm_id' },
    );
    if (error) throw error;
  }
  console.log(`  inserted ${fresh.length}, refreshed ${known.length}`);

  const { data: reresolved, error: areaErr } = await db.rpc('admin_refresh_place_areas');
  if (areaErr) throw areaErr;
  console.log(`  linked neighbourhoods to suburbs; re-resolved ${String(reresolved)} place areas`);

  console.log('4/4 Report');
  type R = { area_id: string | null; diet_flags: string[]; cuisine_tags: string[] };
  const rows: R[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('places')
      .select('area_id, diet_flags, cuisine_tags')
      .eq('source', 'osm')
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data as R[]));
    if (data.length < 1000) break;
  }
  const { data: areaNames } = await db.from('areas').select('id, slug');
  const slugById = new Map((areaNames ?? []).map((a) => [a.id as string, a.slug as string]));
  const perArea = new Map<string, number>();
  for (const r of rows) {
    const k = r.area_id ? (slugById.get(r.area_id) ?? '?') : '(no area)';
    perArea.set(k, (perArea.get(k) ?? 0) + 1);
  }
  const pct = (n: number) => `${((100 * n) / Math.max(rows.length, 1)).toFixed(1)}%`;
  console.log(`  total OSM places: ${rows.length}`);
  console.log(`  with diet flags:  ${pct(rows.filter((r) => r.diet_flags.length > 0).length)}`);
  console.log(`  with cuisine:     ${pct(rows.filter((r) => r.cuisine_tags.length > 0).length)}`);
  console.log(`  with no area:     ${perArea.get('(no area)') ?? 0}`);
  console.log('  top areas:');
  for (const [slug, n] of [...perArea.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`    ${slug.padEnd(28)} ${n}`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
