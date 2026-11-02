// Pure OSM -> Food Circle mapping (PLACES_DATA.md §3-4). No I/O here, so it is unit-tested.
import { normalizeName, slugify } from './text';

export type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export type PlaceType =
  'restaurant' | 'cafe' | 'street_stall' | 'bakery' | 'sweet_shop' | 'bar' | 'other';

export type BrandDef = { slug: string; name: string; match: string[] };

export type PlaceRow = {
  osm_id: string;
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  type: PlaceType;
  diet_flags: string[];
  cuisine_tags: string[];
  brand: { slug: string; name: string } | null;
};

export type AreaRow = {
  slug: string;
  name: string;
  kind: 'suburb' | 'neighbourhood';
  lat: number;
  lng: number;
  region: RegionSlug | null;
};

export type RegionSlug = 'south-mumbai' | 'western-suburbs' | 'central-suburbs' | 'harbour';

export const REGIONS: Record<RegionSlug, string> = {
  'south-mumbai': 'South Mumbai',
  'western-suburbs': 'Western Suburbs',
  'central-suburbs': 'Central Suburbs',
  harbour: 'Harbour',
};

function coords(el: OsmElement): { lat: number; lng: number } | null {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat === undefined || lng === undefined) return null;
  return { lat, lng };
}

export function placeType(tags: Record<string, string>): PlaceType | null {
  const amenity = tags.amenity;
  const shop = tags.shop;
  if (amenity === 'cafe') return 'cafe';
  if (amenity === 'restaurant' || amenity === 'fast_food' || amenity === 'food_court')
    return 'restaurant';
  if (amenity === 'ice_cream') return 'restaurant';
  if (amenity === 'bar' || amenity === 'pub') return 'bar';
  if (shop === 'bakery' || shop === 'pastry') return 'bakery';
  if (shop === 'confectionery') return 'sweet_shop';
  return null;
}

export function dietFlags(tags: Record<string, string>): string[] {
  const flags = new Set<string>();
  const veg = tags['diet:vegetarian'];
  if (veg === 'only') flags.add('pure_veg');
  else if (veg === 'yes') flags.add('veg_options');
  const halal = tags['diet:halal'];
  if (halal === 'yes' || halal === 'only') flags.add('halal');
  return [...flags];
}

const CUISINE_SYNONYMS: Record<string, string> = {
  irani: 'irani_cafe',
  south_indian: 'udupi',
  udupi: 'udupi',
};

export function cuisineTags(tags: Record<string, string>, name: string): string[] {
  const out = new Set<string>();
  if (tags.amenity === 'ice_cream') out.add('ice_cream');
  const raw = tags.cuisine ?? '';
  const thali = /thali/i.test(name) || /thali/i.test(raw);
  for (const part of raw.split(';')) {
    const v = part
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    if (!v) continue;
    if (v === 'gujarati') {
      out.add(thali ? 'gujarati_thali' : 'gujarati');
      continue;
    }
    out.add(CUISINE_SYNONYMS[v] ?? v);
  }
  return [...out].sort();
}

export function matchBrand(
  tags: Record<string, string>,
  name: string,
  brands: BrandDef[],
): { slug: string; name: string } | null {
  const tagged = tags.brand?.trim();
  const candidates = [tagged, name].filter((s): s is string => Boolean(s)).map(normalizeName);
  for (const b of brands) {
    if (candidates.some((c) => b.match.includes(c))) return { slug: b.slug, name: b.name };
  }
  // OSM brand tag not in the curated list: still a chain, keep it so the chain cap applies.
  if (tagged) return { slug: slugify(tagged), name: tagged };
  return null;
}

export function toPlaceRow(el: OsmElement, brands: BrandDef[]): PlaceRow | null {
  const tags = el.tags ?? {};
  const name = tags.name?.trim();
  if (!name) return null; // skip features without a name
  const type = placeType(tags);
  if (!type) return null;
  const c = coords(el);
  if (!c) return null;

  const aliases = new Set<string>();
  const en = tags['name:en']?.trim();
  if (en && normalizeName(en) !== normalizeName(name)) aliases.add(en);

  return {
    osm_id: `${el.type}/${el.id}`,
    name: name.slice(0, 120),
    aliases: [...aliases],
    lat: c.lat,
    lng: c.lng,
    type,
    diet_flags: dietFlags(tags),
    cuisine_tags: cuisineTags(tags, name),
    brand: matchBrand(tags, name, brands),
  };
}

/**
 * Coarse region assignment by position. Heuristic, editable later; recorded in DECISIONS.md.
 * South Mumbai: south of ~Mahim/Sion line. West of the Central line: western suburbs.
 * East of ~72.89 and south of 19.09 (Chembur, Mankhurd, Trombay): harbour. Rest: central.
 */
export function regionFor(lat: number, lng: number): RegionSlug {
  if (lat < 19.035) return 'south-mumbai';
  if (lng >= 72.89 && lat < 19.09) return 'harbour';
  if (lng < 72.865) return 'western-suburbs';
  return 'central-suburbs';
}

export function toAreaRow(el: OsmElement): AreaRow | null {
  const tags = el.tags ?? {};
  const name = (tags['name:en'] ?? tags.name)?.trim();
  if (!name) return null;
  const kind =
    tags.place === 'suburb' ? 'suburb' : tags.place === 'neighbourhood' ? 'neighbourhood' : null;
  if (!kind) return null;
  const c = coords(el);
  if (!c) return null;
  const slug = slugify(name);
  if (!slug) return null;
  return { slug, name, kind, lat: c.lat, lng: c.lng, region: regionFor(c.lat, c.lng) };
}

/** Same slug can appear twice (e.g. a suburb and a neighbourhood). Prefer suburbs. */
export function dedupeAreas(rows: AreaRow[]): AreaRow[] {
  const bySlug = new Map<string, AreaRow>();
  for (const r of rows) {
    const existing = bySlug.get(r.slug);
    if (!existing || (existing.kind === 'neighbourhood' && r.kind === 'suburb'))
      bySlug.set(r.slug, r);
  }
  return [...bySlug.values()];
}
