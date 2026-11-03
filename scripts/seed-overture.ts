/**
 * pnpm seed:overture [--refresh] [--dry-run] [--sql <dir>]
 *
 * Imports Mumbai food places from Overture Maps Places (open data: CDLA-Permissive-2.0 /
 * Apache-2.0 / CC0 per source). Run after seed:osm so OSM places win and Overture fills gaps.
 *   default      import into the database in .env.local via admin_import_overture (secret key)
 *   --sql <dir>  write idempotent SQL batches for a hosted database's SQL editor instead
 *   --refresh    re-download from Overture (otherwise the cache in data/raw/ is used)
 * Only places inside Greater Mumbai (Mumbai City + Mumbai Suburban districts) are kept.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDBInstance } from '@duckdb/node-api';
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import type { BrandDef } from './osm/transform';
import { dedupeRows, toImportRow, type ImportRow, type OvertureRow } from './overture/transform';

loadEnv({ path: '.env.local' });

const RELEASE = '2026-10-21.0';
const S3 = `s3://overturemaps-us-west-2/release/${RELEASE}`;
const BBOX = { xmin: 72.76, xmax: 73.0, ymin: 18.88, ymax: 19.3 };
const DISTRICTS = ['Mumbai City District', 'Mumbai Suburban District'];
const CACHE = join('data', 'raw', `overture-mumbai-food-${RELEASE}.json`);
const BATCH = 1000;

const argv = process.argv.slice(2);
const REFRESH = argv.includes('--refresh');
const DRY_RUN = argv.includes('--dry-run');
const sqlIdx = argv.indexOf('--sql');
const SQL_DIR = sqlIdx >= 0 ? argv[sqlIdx + 1] : undefined;

async function fetchOverture(): Promise<OvertureRow[]> {
  if (!REFRESH && existsSync(CACHE)) {
    console.log(`  using cached ${CACHE}`);
    return JSON.parse(readFileSync(CACHE, 'utf8')) as OvertureRow[];
  }
  console.log(`  querying Overture ${RELEASE} (reads only the Mumbai slice, ~1-2 min)...`);
  const db = await DuckDBInstance.create(':memory:');
  const c = await db.connect();
  await c.run(
    "INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET s3_region='us-west-2'; SET geometry_always_xy = true;",
  );
  const inBbox = (alias: string) =>
    `${alias}.bbox.xmin BETWEEN ${BBOX.xmin} AND ${BBOX.xmax} AND ${alias}.bbox.ymin BETWEEN ${BBOX.ymin} AND ${BBOX.ymax}`;
  await c.run(`CREATE TABLE mumbai AS
    SELECT ST_Union_Agg(geometry) AS geom
    FROM read_parquet('${S3}/theme=divisions/type=division_area/*', hive_partitioning=1) d
    WHERE ${inBbox('d')} AND d.subtype = 'county' AND d.names.primary IN (${DISTRICTS.map((n) => `'${n}'`).join(',')})`);
  const reader = await c.runAndReadAll(`
    SELECT p.id, p.names.primary AS name, ST_Y(p.geometry) AS lat, ST_X(p.geometry) AS lng,
           p.confidence, p.basic_category, p.taxonomy.primary AS cat, p.operating_status,
           p.brand.names.primary AS brand
    FROM read_parquet('${S3}/theme=places/type=place/*', hive_partitioning=1) p, mumbai m
    WHERE ${inBbox('p')} AND ST_Within(p.geometry, m.geom)`);
  const rows = reader.getRowObjectsJson() as unknown as OvertureRow[];
  mkdirSync(join('data', 'raw'), { recursive: true });
  writeFileSync(CACHE, JSON.stringify(rows));
  return rows;
}

/** The RPC payload: everything except the local-only confidence score. */
function toPayload(r: ImportRow): Omit<ImportRow, 'confidence'> {
  const { confidence, ...rest } = r;
  void confidence;
  return rest;
}

const sqlString = (s: string) => `'${s.replace(/'/g, "''")}'`;

function writeSql(rows: ImportRow[], dir: string) {
  mkdirSync(dir, { recursive: true });
  const batches = Math.ceil(rows.length / 5000);
  for (let i = 0; i < batches; i++) {
    const part = rows.slice(i * 5000, (i + 1) * 5000).map(toPayload);
    const file = join(dir, `overture-${String(i + 1).padStart(2, '0')}-of-${batches}.sql`);
    writeFileSync(
      file,
      `-- Food Circle: Overture places batch ${i + 1}/${batches} (idempotent; run in any order)\n` +
        `select * from public.admin_import_overture(${sqlString(JSON.stringify(part))}::jsonb);\n`,
      'utf8',
    );
    console.log(`  wrote ${file}`);
  }
}

async function main() {
  console.log('1/3 Fetching Overture places');
  const raw = await fetchOverture();
  const brands = JSON.parse(readFileSync(join('data', 'brands.json'), 'utf8')) as BrandDef[];
  const mapped = raw.map((r) => toImportRow(r, brands)).filter((r): r is ImportRow => r !== null);
  const rows = dedupeRows(mapped);
  const byType = new Map<string, number>();
  for (const r of rows) byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
  console.log(
    `  ${raw.length} places in Greater Mumbai -> ${mapped.length} food places -> ${rows.length} after dedupe`,
  );
  console.log(`  by type: ${[...byType].map(([t, n]) => `${t} ${n}`).join(', ')}`);
  console.log(`  unverified (confidence < 0.5): ${rows.filter((r) => !r.confident).length}`);
  if (DRY_RUN) return;

  if (SQL_DIR) {
    console.log('2/3 Writing SQL batches');
    writeSql(rows, SQL_DIR);
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log('2/3 Importing (skips places we already have)');
  const total = { inserted: 0, linked: 0, skipped: 0 };
  for (let i = 0; i < rows.length; i += BATCH) {
    const part = rows.slice(i, i + BATCH).map(toPayload);
    const { data, error } = await db.rpc('admin_import_overture', { p_rows: part });
    if (error) throw error;
    const res = data[0];
    if (res) {
      total.inserted += res.inserted;
      total.linked += res.linked;
      total.skipped += res.skipped;
    }
    process.stdout.write(`\r  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log(
    `\n3/3 Done: inserted ${total.inserted}, linked to existing ${total.linked}, skipped ${total.skipped}`,
  );
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
