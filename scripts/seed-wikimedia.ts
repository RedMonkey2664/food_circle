/**
 * pnpm seed:wikimedia [--only jaipur,agra] [--env .env.hosted.local] [--dry-run]
 *
 * Adds freely licensed descriptions and photos to places (DECISIONS.md 2026-11-08):
 *  - Wikidata items with coordinates and an image (P18) inside each region (Wikidata is CC0)
 *  - the image's author and licence from Wikimedia Commons (only free licences are kept;
 *    every photo is shown with its author, licence and a link to its Commons page)
 *  - a short English Wikipedia intro where one exists (CC BY-SA 4.0, credited with a link)
 * The database matches each item to our nearest place with a similar name (within 250 m).
 * Nothing is scraped: these are the public Wikimedia APIs, called politely and in batches.
 */
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { REGIONS, type Region } from './overture/regions';

const argv = process.argv.slice(2);
const arg = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
loadEnv({ path: arg('--env') ?? '.env.local', override: true });
const DRY_RUN = argv.includes('--dry-run');
const ONLY = arg('--only')?.split(',');

// Wikimedia asks API clients to identify themselves.
const UA = 'SKOOP-place-import/0.1 (https://food-circle-xi.vercel.app)';
const MUMBAI: Region = {
  slug: 'mumbai',
  name: 'Mumbai',
  state: 'Maharashtra',
  kind: 'metro',
  bbox: { xmin: 72.76, xmax: 73.0, ymin: 18.88, ymax: 19.3 },
};
const ALL = [MUMBAI, ...REGIONS].filter((r) => !ONLY || ONLY.includes(r.slug));
const FREE = /^(cc[ -]?by|cc[ -]?zero|cc0|public domain|pd|gfdl|attribution|cc-by-sa|cc by-sa)/i;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function getJson<T>(url: string, tries = 4): Promise<T> {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.ok) return (await res.json()) as T;
    if (i >= tries || ![429, 500, 502, 503, 504].includes(res.status)) {
      throw new Error(`${res.status} ${url.slice(0, 120)}`);
    }
    await sleep(2000 * 2 ** i);
  }
}
const stripHtml = (s: string) =>
  s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
const chunks = <T>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

type Item = {
  qid: string;
  /** 'food' when Wikidata says it is an eatery; only then may it match a food place. */
  kind: 'food' | 'other';
  label: string;
  lat: number;
  lng: number;
  description: string | null;
  file: string;
  wikiTitle: string | null;
};

async function itemsIn(r: Region): Promise<Item[]> {
  const { xmin, xmax, ymin, ymax } = r.bbox;
  // Eateries: restaurant, cafe, bakery, bar, pub, fast food, teahouse, drinking establishment.
  const FOOD = [
    'Q11707',
    'Q30022',
    'Q274393',
    'Q187456',
    'Q212198',
    'Q1751429',
    'Q1323202',
    'Q5307737',
  ];
  const q = `SELECT ?item ?itemLabel ?itemDescription ?coord ?image ?article ?food WHERE {
    SERVICE wikibase:box { ?item wdt:P625 ?coord .
      bd:serviceParam wikibase:cornerSouthWest "Point(${xmin} ${ymin})"^^geo:wktLiteral .
      bd:serviceParam wikibase:cornerNorthEast "Point(${xmax} ${ymax})"^^geo:wktLiteral . }
    ?item wdt:P18 ?image .
    BIND(EXISTS { ?item wdt:P31/wdt:P279? ?c . VALUES ?c { ${FOOD.map((f) => `wd:${f}`).join(' ')} } } AS ?food)
    OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } LIMIT 4000`;
  type Row = Record<string, { value: string } | undefined>;
  const data = await getJson<{ results: { bindings: Row[] } }>(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`,
  );
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const b of data.results.bindings) {
    const qid = b.item?.value.split('/').pop() ?? '';
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(b.coord?.value ?? '');
    const label = b.itemLabel?.value ?? '';
    if (!/^Q\d+$/.test(qid) || !m || seen.has(qid) || /^Q\d+$/.test(label)) continue;
    seen.add(qid);
    const file = decodeURIComponent((b.image?.value ?? '').split('/Special:FilePath/').pop() ?? '');
    const article = b.article?.value;
    out.push({
      qid,
      kind: b.food?.value === 'true' ? 'food' : 'other',
      label,
      lng: Number(m[1]),
      lat: Number(m[2]),
      description: b.itemDescription?.value ?? null,
      file: file.replace(/_/g, ' '),
      wikiTitle: article ? decodeURIComponent(article.split('/wiki/').pop() ?? '') : null,
    });
  }
  return out;
}

type Meta = {
  thumb: string;
  width: number;
  height: number;
  author: string | null;
  licence: string;
  licenceUrl: string | null;
};
async function commonsMeta(files: string[]): Promise<Map<string, Meta>> {
  const out = new Map<string, Meta>();
  for (const part of chunks(files, 40)) {
    const titles = part.map((f) => `File:${f}`).join('|');
    type Page = {
      title: string;
      imageinfo?: {
        thumburl: string;
        thumbwidth: number;
        thumbheight: number;
        extmetadata?: Record<string, { value: string } | undefined>;
      }[];
    };
    const data = await getJson<{ query?: { pages?: Record<string, Page> } }>(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&titles=${encodeURIComponent(titles)}`,
    );
    for (const p of Object.values(data.query?.pages ?? {})) {
      const ii = p.imageinfo?.[0];
      const md = ii?.extmetadata ?? {};
      const licence = stripHtml(md.LicenseShortName?.value ?? '');
      if (!ii?.thumburl || !FREE.test(licence) || /non-free|fair use/i.test(licence)) continue;
      out.set(p.title.replace(/^File:/, ''), {
        thumb: ii.thumburl.split('?')[0] ?? ii.thumburl,
        width: ii.thumbwidth,
        height: ii.thumbheight,
        author: md.Artist?.value ? stripHtml(md.Artist.value).slice(0, 200) : null,
        licence: licence.slice(0, 80),
        licenceUrl: md.LicenseUrl?.value ?? null,
      });
    }
    await sleep(200);
  }
  return out;
}

async function extracts(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const part of chunks(titles, 20)) {
    type Page = { title: string; extract?: string };
    const data = await getJson<{
      query?: { pages?: Record<string, Page>; normalized?: { from: string; to: string }[] };
    }>(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&exsentences=3&exlimit=20&titles=${encodeURIComponent(part.join('|'))}`,
    );
    const back = new Map((data.query?.normalized ?? []).map((n) => [n.to, n.from]));
    for (const p of Object.values(data.query?.pages ?? {})) {
      if (p.extract) out.set(back.get(p.title) ?? p.title, p.extract.slice(0, 1500));
    }
    await sleep(200);
  }
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const db =
    !DRY_RUN && url && key
      ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;
  if (!DRY_RUN && !db) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY missing');

  let matched = 0;
  for (const region of ALL) {
    const items = await itemsIn(region);
    const meta = await commonsMeta([...new Set(items.map((i) => i.file))]);
    const ex = await extracts([
      ...new Set(items.map((i) => i.wikiTitle).filter((t): t is string => !!t)),
    ]);
    const rows = items
      .filter((i) => meta.has(i.file))
      .map((i) => {
        const m = meta.get(i.file) as Meta;
        return {
          qid: i.qid,
          kind: i.kind,
          label: i.label,
          lat: i.lat,
          lng: i.lng,
          description: i.description,
          wiki_title: i.wikiTitle,
          wiki_url: i.wikiTitle
            ? `https://en.wikipedia.org/wiki/${encodeURIComponent(i.wikiTitle.replace(/ /g, '_'))}`
            : null,
          extract: i.wikiTitle ? (ex.get(i.wikiTitle) ?? null) : null,
          file_title: i.file,
          thumb_url: m.thumb,
          width: m.width,
          height: m.height,
          author: m.author,
          licence: m.licence,
          licence_url: m.licenceUrl,
          page_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(i.file.replace(/ /g, '_'))}`,
        };
      });
    let got = 0;
    let photos = 0;
    if (db) {
      for (const part of chunks(rows, 300)) {
        const { data, error } = await db.rpc('admin_import_wikimedia', { p_rows: part });
        if (error) throw new Error(`${region.slug}: ${error.message}`);
        got += data?.[0]?.matched ?? 0;
        photos += data?.[0]?.photos ?? 0;
      }
    }
    matched += got;
    console.log(
      `  ${region.name.padEnd(14)} ${String(items.length).padStart(5)} items  ${String(rows.length).padStart(5)} free photos  ${String(got).padStart(4)} matched  ${String(photos).padStart(4)} photos`,
    );
  }
  console.log(`Done: ${matched} places got a description/photo${DRY_RUN ? ' (dry run)' : ''}.`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
