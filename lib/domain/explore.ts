import { z } from 'zod';
import type { PlaceType } from './place';

// Explore (2026-11-24, human request: "explore restaurants like Swiggy Dineout"). Browsing
// every food place in a city, from data SKOOP already holds. Filters live in the URL so the
// page is server-rendered, shareable and works without JavaScript.

export const EXPLORE_PAGE_SIZE = 24;

/** Type filters, in chip order. */
export const EXPLORE_TYPES = [
  'restaurant',
  'cafe',
  'street_stall',
  'bakery',
  'sweet_shop',
  'bar',
] as const satisfies readonly PlaceType[];
export type ExploreType = (typeof EXPLORE_TYPES)[number];

/** Cuisine filters (tags as stored on places.cuisine_tags; the commonest ones), in chip order. */
export const EXPLORE_CUISINES = [
  'chinese',
  'pizza',
  'burger',
  'seafood',
  'italian',
  'udupi',
  'vada_pav',
  'sandwich',
  'ice_cream',
  'japanese',
  'mexican',
  'lebanese',
  'thai',
  'barbecue',
] as const;

const params = z.object({
  type: z.enum(EXPLORE_TYPES).optional().catch(undefined),
  cuisine: z
    .string()
    .regex(/^[a-z_]{2,40}$/)
    .optional()
    .catch(undefined),
  veg: z
    .literal('1')
    .optional()
    .catch(undefined)
    .transform((v) => v === '1'),
  q: z
    .string()
    .trim()
    .max(60)
    .optional()
    .catch(undefined)
    .transform((v) => (v ? v : undefined)),
  page: z.coerce.number().int().min(1).max(40).optional().catch(undefined),
});

export type ExploreFilters = {
  type?: ExploreType;
  cuisine?: string;
  veg: boolean;
  q?: string;
  page: number;
};

/** Reads filters from search params; anything invalid is simply ignored. */
export function parseExploreFilters(
  raw: Record<string, string | string[] | undefined>,
): ExploreFilters {
  const one = (k: string) => {
    const v = raw[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const p = params.parse({
    type: one('type'),
    cuisine: one('cuisine'),
    veg: one('veg'),
    q: one('q'),
    page: one('page'),
  });
  return {
    ...(p.type ? { type: p.type } : {}),
    ...(p.cuisine ? { cuisine: p.cuisine } : {}),
    veg: p.veg,
    ...(p.q ? { q: p.q } : {}),
    page: p.page ?? 1,
  };
}

/** The URL for a set of filters (page 1 unless given). Empty filters give plain /explore. */
export function exploreHref(f: Partial<ExploreFilters>): string {
  const sp = new URLSearchParams();
  if (f.type) sp.set('type', f.type);
  if (f.cuisine) sp.set('cuisine', f.cuisine);
  if (f.veg) sp.set('veg', '1');
  if (f.q) sp.set('q', f.q);
  if (f.page && f.page > 1) sp.set('page', String(f.page));
  const s = sp.toString();
  return s ? `/explore?${s}` : '/explore';
}

/** True when any filter (other than the page) is on. */
export function hasFilters(f: ExploreFilters): boolean {
  return Boolean(f.type || f.cuisine || f.veg || f.q);
}
