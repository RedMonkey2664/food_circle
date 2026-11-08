// Pure Overture Places -> Food Circle mapping (DECISIONS.md, 2026-11-03). No I/O: unit-tested.
import { matchBrand, type BrandDef, type PlaceType } from '../osm/transform';
import { normalizeName } from '../osm/text';

export type OvertureRow = {
  id: string;
  name: string | null;
  lat: number;
  lng: number;
  confidence: number | null;
  basic_category: string | null;
  cat: string | null;
  operating_status: string | null;
  brand: string | null;
};

export type ImportRow = {
  overture_id: string;
  name: string;
  lat: number;
  lng: number;
  type: PlaceType;
  diet_flags: string[];
  cuisine_tags: string[];
  brand_slug: string | null;
  brand_name: string | null;
  confident: boolean;
  confidence: number;
  /** Overture category (basic or taxonomy), e.g. 'fort', 'cafe'. */
  category: string | null;
  /** Set by the importer for regions outside Mumbai. */
  city?: string;
};

/** Below this Overture confidence a place is dropped; below CONFIDENT it is imported unverified. */
export const MIN_CONFIDENCE = 0.2;
export const CONFIDENT = 0.5;
/** Attractions are noisier (offices named "Heritage..."), so they need more confidence. */
export const MIN_ATTRACTION_CONFIDENCE = 0.5;

/** Tourist attractions you can log a verdict on (human decision, 2026-11-08). Generic parks are left out. */
export const ATTRACTIONS = new Set([
  'historic_site',
  'monument',
  'museum',
  'fort',
  'palace',
  'castle',
  'landmark_and_historical_building',
  'tourist_attraction',
  'lake',
  'beach',
  'waterfall',
  'island',
  'national_park',
  'nature_reserve',
  'botanical_garden',
  'zoo',
  'mountain',
  'viewpoint',
  'scenic_point',
  'amusement_park',
  'art_gallery',
  'science_attraction',
  'animal_attraction',
  'cultural_center',
  'religious_organization',
]);

const BY_BASIC: Record<string, PlaceType> = {
  restaurant: 'restaurant',
  casual_eatery: 'restaurant',
  fast_food_restaurant: 'restaurant',
  food_court: 'restaurant',
  food_and_drink: 'restaurant',
  cafe: 'cafe',
  coffee_shop: 'cafe',
  non_alcoholic_beverage_venue: 'cafe',
  smoothie_juice_bar: 'cafe',
  bar: 'bar',
  food_truck_stand: 'street_stall',
};

// Shop-like taxonomy categories that are still places you eat from.
const BY_CAT: Record<string, PlaceType> = {
  bakery: 'bakery',
  patisserie_cake_shop: 'bakery',
  cupcake_shop: 'bakery',
  dessert_shop: 'sweet_shop',
  candy_store: 'sweet_shop',
  indian_sweets_shop: 'sweet_shop',
  chocolatier: 'sweet_shop',
  ice_cream_shop: 'restaurant',
  shaved_ice_shop: 'restaurant',
  delicatessen: 'cafe',
  tea_room: 'cafe',
  juice_bar: 'cafe',
  food_stand: 'street_stall',
  street_vendor: 'street_stall',
  food_truck: 'street_stall',
};

// Categories that look like food but are not somewhere you go to eat.
const NOT_A_PLACE_TO_EAT = new Set([
  'caterer',
  'food_delivery_service',
  'personal_chef',
  'custom_cakes_shop',
  'food_bank',
]);

export function placeTypeFor(basic: string | null, cat: string | null): PlaceType | null {
  if (basic && ATTRACTIONS.has(basic)) return 'attraction';
  if (cat && NOT_A_PLACE_TO_EAT.has(cat)) return null;
  if (cat && BY_CAT[cat]) return BY_CAT[cat];
  if (basic && BY_BASIC[basic]) return BY_BASIC[basic];
  return null;
}

const GENERIC_CAT = new Set([
  'restaurant',
  'casual_eatery',
  'fast_food_restaurant',
  'food_court',
  'food_and_drink',
  'cafe',
  'coffee_shop',
  'bar',
  'bakery',
  'dessert_shop',
  'candy_store',
  'diner',
  'food_stand',
  'indian_restaurant',
  'vegetarian_restaurant',
  'vegan_restaurant',
  'halal_restaurant',
  'comfort_food_restaurant',
]);

const CUISINE_SYNONYMS: Record<string, string> = { south_indian: 'udupi', irani: 'irani_cafe' };

export function cuisineTagsFor(cat: string | null, name: string): string[] {
  const out = new Set<string>();
  if (cat === 'ice_cream_shop') out.add('ice_cream');
  if (cat && !GENERIC_CAT.has(cat) && /_restaurant$/.test(cat)) {
    const c = cat.replace(/_restaurant$/, '');
    out.add(CUISINE_SYNONYMS[c] ?? c);
  }
  const n = normalizeName(name);
  if (/\bvada ?pav\b|\bwada ?pav\b/.test(n)) out.add('vada_pav');
  if (/\birani\b/.test(n)) out.add('irani_cafe');
  if (/\budupi\b|\budipi\b/.test(n)) out.add('udupi');
  return [...out].sort();
}

export function dietFlagsFor(cat: string | null, name: string): string[] {
  const flags = new Set<string>();
  if (cat === 'vegetarian_restaurant' || cat === 'vegan_restaurant') flags.add('pure_veg');
  if (/\bpure veg\b/.test(normalizeName(name))) flags.add('pure_veg');
  if (cat === 'halal_restaurant') flags.add('halal');
  return [...flags];
}

// Names that are only a category ("Restaurant", "Bakery & Cake Shop") are not useful to search.
const GENERIC_NAMES = new Set(
  [
    'restaurant',
    'cafe',
    'bakery',
    'hotel',
    'canteen',
    'bar',
    'bakery and cake shop',
    'cake shop',
    'tea stall',
    'chai',
    'food court',
    'fast food',
    'juice centre',
    'juice center',
    'snacks',
  ].map(normalizeName),
);

export function cleanName(raw: string | null): string | null {
  if (!raw) return null;
  const name = raw
    .replace(/\s+/g, ' ')
    .replace(/[\s,.;:-]+$/, '')
    .trim();
  const n = normalizeName(name);
  if (n.length < 2 || GENERIC_NAMES.has(n)) return null;
  return name.slice(0, 120);
}

export function toImportRow(r: OvertureRow, brands: BrandDef[]): ImportRow | null {
  if (r.operating_status && r.operating_status !== 'open') return null;
  const confidence = r.confidence ?? 0;
  if (confidence < MIN_CONFIDENCE) return null;
  const type = placeTypeFor(r.basic_category, r.cat);
  if (!type) return null;
  if (type === 'attraction' && confidence < MIN_ATTRACTION_CONFIDENCE) return null;
  const name = cleanName(r.name);
  if (!name) return null;
  const brand = matchBrand(r.brand ? { brand: r.brand } : {}, name, brands);
  return {
    overture_id: r.id,
    name,
    lat: r.lat,
    lng: r.lng,
    type,
    diet_flags: type === 'attraction' ? [] : dietFlagsFor(r.cat, name),
    cuisine_tags: type === 'attraction' ? [] : cuisineTagsFor(r.cat, name),
    brand_slug: brand?.slug ?? null,
    brand_name: brand?.name ?? null,
    confident: confidence >= CONFIDENT,
    confidence,
    category:
      (type === 'attraction' ? r.basic_category : (r.cat ?? r.basic_category))?.slice(0, 60) ??
      null,
  };
}

/** Metres between two points (equirectangular; fine at city scale). */
export function distanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const k = Math.PI / 180;
  const x = (b.lng - a.lng) * k * Math.cos(((a.lat + b.lat) / 2) * k);
  const y = (b.lat - a.lat) * k;
  return Math.sqrt(x * x + y * y) * 6_371_000;
}

/**
 * Overture often lists one place twice (two sources). Same normalized name within `radiusM`:
 * keep the most confident. Chain branches far apart are kept.
 */
export function dedupeRows(rows: ImportRow[], radiusM = 40): ImportRow[] {
  const sorted = [...rows].sort((a, b) => b.confidence - a.confidence);
  const kept = new Map<string, ImportRow[]>();
  const out: ImportRow[] = [];
  for (const r of sorted) {
    const key = normalizeName(r.name);
    const same = kept.get(key) ?? [];
    if (same.some((k) => distanceM(k, r) <= radiusM)) continue;
    same.push(r);
    kept.set(key, same);
    out.push(r);
  }
  return out;
}
