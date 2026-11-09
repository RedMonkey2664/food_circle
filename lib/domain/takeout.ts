// Google Takeout "Maps (your places)" files, read on the user's own device: their reviews
// (Reviews.json) and saved places (Saved Places.json). It is the user's own data; SKOOP only
// receives the entries they choose to import. Google has changed the format over the years,
// so keys are matched loosely (case, spaces and underscores ignored).
import type { Verdict } from './verdict';

export type TakeoutItem = {
  kind: 'review' | 'saved';
  name: string;
  lat: number;
  lng: number;
  /** 1-5 stars (reviews only). */
  rating: number | null;
  /** The user's own review text. */
  text: string | null;
  /** YYYY-MM-DD, when the review was published (used as the visit date). */
  date: string | null;
  address: string | null;
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const norm = (k: string) => k.toLowerCase().replace(/[\s_-]+/g, '');

/** Reads `obj[key]` ignoring case, spaces and underscores in the key. */
function get(obj: unknown, ...keys: string[]): unknown {
  if (!isObj(obj)) return undefined;
  const wanted = new Set(keys.map(norm));
  for (const [k, v] of Object.entries(obj)) if (wanted.has(norm(k))) return v;
  return undefined;
}
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

function coords(feature: Obj, location: unknown): { lat: number; lng: number } | null {
  const geo = get(feature, 'geometry');
  const c = get(geo, 'coordinates');
  if (Array.isArray(c) && c.length >= 2) {
    const lng = num(c[0]);
    const lat = num(c[1]);
    if (lat !== null && lng !== null && !(lat === 0 && lng === 0)) return { lat, lng };
  }
  const g = get(location, 'geocoordinates', 'geo coordinates');
  const lat = num(get(g, 'latitude'));
  const lng = num(get(g, 'longitude'));
  if (lat !== null && lng !== null && !(lat === 0 && lng === 0)) return { lat, lng };
  return null;
}

/** Parses one Takeout JSON file. Unknown shapes give an empty list, never an exception. */
export function parseTakeout(json: unknown): TakeoutItem[] {
  const features = get(json, 'features');
  if (!Array.isArray(features)) return [];
  const out: TakeoutItem[] = [];
  for (const f of features) {
    if (!isObj(f)) continue;
    const p = get(f, 'properties');
    const location = get(p, 'location');
    const name = str(get(location, 'name', 'business name')) ?? str(get(p, 'title'));
    const at = coords(f, location);
    if (!name || !at) continue;
    const rating = num(get(p, 'five star rating published', 'star rating', 'rating'));
    const rawDate = str(get(p, 'date', 'published'));
    out.push({
      kind: rating !== null ? 'review' : 'saved',
      name: name.slice(0, 120),
      lat: at.lat,
      lng: at.lng,
      rating: rating !== null ? Math.min(5, Math.max(1, Math.round(rating))) : null,
      text:
        str(get(p, 'review text published', 'review comment', 'comment'))?.slice(0, 1000) ?? null,
      date: rawDate && /^\d{4}-\d{2}-\d{2}/.test(rawDate) ? rawDate.slice(0, 10) : null,
      address: str(get(location, 'address')),
    });
  }
  return out;
}

/** 4-5 stars = Go, 1-2 = Skip, 3 = ask the user (null). */
export function verdictForStars(stars: number | null): Verdict | null {
  if (stars === null) return null;
  if (stars >= 4) return 'go';
  if (stars <= 2) return 'skip';
  return null;
}
