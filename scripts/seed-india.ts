/**
 * pnpm seed:india [--only delhi,goa-north] [--env .env.hosted.local] [--refresh] [--dry-run]
 *
 * Imports India's metros and tourist towns (scripts/overture/regions.ts) from Overture Maps
 * (open data; see DECISIONS.md 2026-11-08): neighbourhood areas first (Overture divisions,
 * ODbL), then food places and tourist attractions (Places, CDLA-Permissive-2.0 etc.).
 *   --env <file>  read NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY from this file instead of
 *                 .env.local (e.g. a gitignored .env.hosted.local for the hosted database)
 *   --refresh     re-download from Overture (otherwise data/raw/ caches are used)
 *   --dry-run     download + transform and print counts, write nothing
 * Idempotent: areas upsert on slug, places skip known overture_ids, so it can be re-run.
 * Mumbai is included for attractions only (its food was imported by seed:overture).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDBInstance } from '@duckdb/node-api';
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import type { BrandDef } from './osm/transform';
import { slugify } from './osm/text';
import { REGIONS, type Region } from './overture/regions';
import { dedupeRows, toImportRow, type ImportRow, type OvertureRow } from './overture/transform';

const argv = process.argv.slice(2);
const arg = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
loadEnv({ path: arg('--env') ?? '.env.local', override: true });

const RELEASE = '2026-10-21.0';
const S3 = `s3://overturemaps-us-west-2/release/${RELEASE}`;
const REFRESH = argv.includes('--refresh');
const DRY_RUN = argv.includes('--dry-run');
const ONLY = arg('--only')?.split(',');

const MUMBAI: Region = {
  slug: 'mumbai',
  name: 'Mumbai',
  state: 'Maharashtra',
  kind: 'metro',
  bbox: { xmin: 72.76, xmax: 73.0, ymin: 18.88, ymax: 19.3 },
};
const ALL = [MUMBAI, ...REGIONS].filter((r) => !ONLY || ONLY.includes(r.slug));

type RegionRow = OvertureRow & { region: string };
type AreaRaw = { region: string; name: string; subtype: string; geojson: string };

const cache = (what: string) => join('data', 'raw', `overture-india-${what}-${RELEASE}.json`);
// An outer box first lets DuckDB skip every file outside it (the OR list alone cannot).
const outer = (alias: string) => {
  const b = ALL.map((g) => g.bbox);
  return `${alias}.bbox.xmin BETWEEN ${Math.min(...b.map((x) => x.xmin))} AND ${Math.max(...b.map((x) => x.xmax))} AND ${alias}.bbox.ymin BETWEEN ${Math.min(...b.map((x) => x.ymin))} AND ${Math.max(...b.map((x) => x.ymax))}`;
};
const inAny = (alias: string) =>
  `${outer(alias)} AND (` +
  ALL.map(
    (g) =>
      `(${alias}.bbox.xmin BETWEEN ${g.bbox.xmin} AND ${g.bbox.xmax} AND ${alias}.bbox.ymin BETWEEN ${g.bbox.ymin} AND ${g.bbox.ymax})`,
  ).join(' OR ') +
  ')';
const regionCase = (alias: string) =>
  `CASE ${ALL.map(
    (g) =>
      `WHEN ${alias}.bbox.xmin BETWEEN ${g.bbox.xmin} AND ${g.bbox.xmax} AND ${alias}.bbox.ymin BETWEEN ${g.bbox.ymin} AND ${g.bbox.ymax} THEN '${g.slug}'`,
  ).join(' ')} END`;

async function fetchAll(): Promise<{ places: RegionRow[]; areas: AreaRaw[] }> {
  const key = ONLY ? ONLY.join('_') : 'all';
  const pFile = cache(`places-${key}`);
  const aFile = cache(`areas-${key}`);
  if (!REFRESH && existsSync(pFile) && existsSync(aFile)) {
    console.log(`  using cached ${pFile}`);
    return {
      places: JSON.parse(readFileSync(pFile, 'utf8')) as RegionRow[],
      areas: JSON.parse(readFileSync(aFile, 'utf8')) as AreaRaw[],
    };
  }
  console.log(`  querying Overture ${RELEASE} for ${ALL.length} regions (a few minutes)...`);
  const db = await DuckDBInstance.create(':memory:');
  const c = await db.connect();
  await c.run(
    "INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET s3_region='us-west-2'; SET geometry_always_xy = true;",
  );
  const places = (
    await c.runAndReadAll(`
    SELECT ${regionCase('p')} AS region, p.id, p.names.primary AS name,
           ST_Y(p.geometry) AS lat, ST_X(p.geometry) AS lng, p.confidence, p.basic_category,
           p.taxonomy.primary AS cat, p.operating_status, p.brand.names.primary AS brand
      FROM read_parquet('${S3}/theme=places/type=place/*', hive_partitioning=1) p
     WHERE (${inAny('p')}) AND p.confidence >= 0.2`)
  ).getRowObjectsJson() as unknown as RegionRow[];
  const areas = (
    await c.runAndReadAll(`
    SELECT ${regionCase('d')} AS region, d.names.primary AS name, d.subtype,
           ST_AsGeoJSON(ST_SimplifyPreserveTopology(d.geometry, 0.0002)) AS geojson
      FROM read_parquet('${S3}/theme=divisions/type=division_area/*', hive_partitioning=1) d
     WHERE (${inAny('d')}) AND d.country = 'IN'
       AND d.subtype IN ('neighborhood', 'macrohood', 'locality') AND d.names.primary IS NOT NULL`)
  ).getRowObjectsJson() as unknown as AreaRaw[];
  mkdirSync(join('data', 'raw'), { recursive: true });
  writeFileSync(pFile, JSON.stringify(places));
  writeFileSync(aFile, JSON.stringify(areas));
  return { places, areas };
}

/** Areas for one region: its neighbourhoods ("Hauz Khas, Delhi NCR"), towns, and the region box. */
function areaRows(region: Region, raw: AreaRaw[]) {
  const seen = new Set<string>();
  const out: { slug: string; name: string; kind: string; city: string; geojson: string }[] = [];
  const push = (base: string, row: Omit<(typeof out)[number], 'slug'>) => {
    let slug = `${region.slug}-${slugify(base)}`.replace(/-+$/, '');
    for (let i = 2; seen.has(slug); i++) slug = `${region.slug}-${slugify(base)}-${i}`;
    seen.add(slug);
    out.push({ slug, ...row });
  };
  const { xmin, xmax, ymin, ymax } = region.bbox;
  out.push({
    slug: region.slug,
    name: region.name,
    kind: 'region',
    city: region.name,
    geojson: JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [xmin, ymin],
          [xmax, ymin],
          [xmax, ymax],
          [xmin, ymax],
          [xmin, ymin],
        ],
      ],
    }),
  });
  seen.add(region.slug);
  for (const a of raw) {
    const name = a.name.trim().slice(0, 80);
    if (!name || !slugify(name)) continue;
    const town = a.subtype === 'locality';
    push(name, {
      name: town ? name : `${name}, ${region.name}`,
      kind: town ? 'region' : 'neighbourhood',
      city: region.name,
      geojson: a.geojson,
    });
  }
  return out;
}

const chunks = <T>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

async function main() {
  const { places, areas } = await fetchAll();
  const brands = JSON.parse(readFileSync(join('data', 'brands.json'), 'utf8')) as BrandDef[];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const db =
    !DRY_RUN && url && key
      ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;
  if (!DRY_RUN && !db) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY missing');
  if (db) console.log(`  target: ${new URL(url ?? '').host}`);

  let totalPlaces = 0;
  for (const region of ALL) {
    const rows = dedupeRows(
      places
        .filter((p) => p.region === region.slug)
        .map((p) => toImportRow(p, brands))
        .filter((r): r is ImportRow => r !== null)
        .filter((r) => region.slug !== 'mumbai' || r.type === 'attraction'),
    ).map((r) => ({ ...r, city: region.name }));
    const regionAreas =
      region.slug === 'mumbai'
        ? []
        : areaRows(
            region,
            areas.filter((a) => a.region === region.slug),
          );
    const food = rows.filter((r) => r.type !== 'attraction').length;
    console.log(
      `  ${region.name.padEnd(14)} ${String(food).padStart(6)} food  ${String(rows.length - food).padStart(5)} attractions  ${String(regionAreas.length).padStart(4)} areas`,
    );
    totalPlaces += rows.length;
    if (!db) continue;

    for (const part of chunks(regionAreas, 150)) {
      const { error } = await db.rpc('admin_import_areas', { p_rows: part });
      if (error) throw new Error(`areas ${region.slug}: ${error.message}`);
    }
    let ins = 0;
    for (const part of chunks(rows, 1000)) {
      const payload = part.map(({ confidence, ...rest }) => {
        void confidence;
        return rest;
      });
      const { data, error } = await db.rpc('admin_import_overture', { p_rows: payload });
      if (error) throw new Error(`places ${region.slug}: ${error.message}`);
      ins += data?.[0]?.inserted ?? 0;
    }
    console.log(`    inserted ${ins}`);
  }
  console.log(
    `Done: ${totalPlaces} places across ${ALL.length} regions${DRY_RUN ? ' (dry run)' : ''}.`,
  );
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
