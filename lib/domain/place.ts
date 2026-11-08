export const PLACE_TYPES = [
  'restaurant',
  'cafe',
  'street_stall',
  'bakery',
  'sweet_shop',
  'bar',
  'attraction',
  'other',
] as const;
export type PlaceType = (typeof PLACE_TYPES)[number];

export const PLACE_TYPE_LABEL: Record<PlaceType, string> = {
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  street_stall: 'Street stall',
  bakery: 'Bakery',
  sweet_shop: 'Sweet shop',
  bar: 'Bar',
  attraction: 'Attraction',
  other: 'Food place',
};

/** 'irani_cafe' -> 'Irani cafe' */
export function cuisineLabel(tag: string): string {
  const s = tag.replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
