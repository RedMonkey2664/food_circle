// Review layer rules (PHASES.md Phase 4, DATABASE.md reviews). Pure: unit-tested.

export const OCCASIONS = [
  'family_dinner',
  'date',
  'group_of_10',
  'late_night',
  'post_exam',
  'pure_veg_family',
] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const OCCASION_LABEL: Record<Occasion, string> = {
  family_dinner: 'Family dinner',
  date: 'Date',
  group_of_10: 'Group of 10',
  late_night: 'Late night',
  post_exam: 'Post-exam',
  pure_veg_family: 'Pure-veg family',
};

/** Price per head slider (whole INR). */
export const PRICE = { min: 50, max: 3000, step: 50 } as const;

export type PriceBand = 'budget' | 'mid' | 'splurge';
export const PRICE_BAND_LABEL: Record<PriceBand, string> = {
  budget: 'Budget',
  mid: 'Mid',
  splurge: 'Splurge',
};

/** Mumbai-ish bands per head: up to 300 budget, up to 800 mid, above that splurge. */
export function priceBand(inr: number): PriceBand {
  if (inr <= 300) return 'budget';
  if (inr <= 800) return 'mid';
  return 'splurge';
}

/** "₹450 per head · Mid", "₹3000+ per head · Splurge" at the top of the slider. */
export function priceLabel(inr: number): string {
  const amount = inr >= PRICE.max ? `₹${PRICE.max}+` : `₹${inr}`;
  return `${amount} per head · ${PRICE_BAND_LABEL[priceBand(inr)]}`;
}

export const MAX_DISHES = 10;
export const MAX_PHOTOS = 6;
export const NOTE_MAX = 2000;
export const DISH_NAME_MAX = 60;

/** Photo targets (PHASES.md P4-03): WebP, long edge <= 1280 px, under 300 KB. */
export const PHOTO = { maxEdge: 1280, targetBytes: 300_000 } as const;

/** Scale (w, h) so the long edge is at most `max`, keeping the aspect ratio. Never upscales. */
export function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  const long = Math.max(w, h);
  if (long <= max) return { width: w, height: h };
  const k = max / long;
  return { width: Math.round(w * k), height: Math.round(h * k) };
}

/** Add a dish chip: trims, collapses spaces, ignores duplicates (case-insensitive). */
export function addDish(list: readonly string[], raw: string): string[] {
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, DISH_NAME_MAX);
  if (!name || list.length >= MAX_DISHES) return [...list];
  if (list.some((d) => d.toLowerCase() === name.toLowerCase())) return [...list];
  return [...list, name];
}
