import type { PlaceType } from './place';

// One honest sentence about a place, written only from facts we hold (type, category,
// cuisine, diet, area, city). No borrowed text, no ratings, never blends trust tiers.

const ATTRACTION_NOUN: Record<string, string> = {
  historic_site: 'historic site',
  landmark_and_historical_building: 'landmark',
  monument: 'monument',
  museum: 'museum',
  fort: 'fort',
  palace: 'palace',
  castle: 'castle',
  tourist_attraction: 'sight',
  lake: 'lake',
  beach: 'beach',
  waterfall: 'waterfall',
  island: 'island',
  national_park: 'national park',
  nature_reserve: 'nature reserve',
  botanical_garden: 'botanical garden',
  zoo: 'zoo',
  mountain: 'hill',
  viewpoint: 'viewpoint',
  scenic_point: 'viewpoint',
  amusement_park: 'amusement park',
  art_gallery: 'art gallery',
  science_attraction: 'science centre',
  animal_attraction: 'wildlife spot',
  cultural_center: 'cultural centre',
  religious_organization: 'place of worship',
};

const TYPE_NOUN: Record<PlaceType, string> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  street_stall: 'street-food stall',
  bakery: 'bakery',
  sweet_shop: 'sweet shop',
  bar: 'bar',
  attraction: 'sight',
  other: 'food spot',
};

const pretty = (tag: string) =>
  tag
    .replace(/_/g, ' ')
    .replace(
      /\b(udupi|irani|punjabi|bengali|gujarati|chinese|italian|mughlai|goan|kerala)\b/g,
      (w) => w.charAt(0).toUpperCase() + w.slice(1),
    );

const an = (word: string) => (/^[aeiou]/i.test(word) ? 'An' : 'A');

export function describePlace(p: {
  type: PlaceType;
  category?: string | null;
  cuisineTags?: string[];
  dietFlags?: string[];
  areaName?: string | null;
  city?: string | null;
}): string {
  let noun: string;
  if (p.type === 'attraction') {
    noun = (p.category && ATTRACTION_NOUN[p.category]) || 'sight';
  } else {
    const cuisine = (p.cuisineTags ?? []).find((t) => !['ice_cream', 'vada_pav'].includes(t));
    const special = (p.cuisineTags ?? []).includes('vada_pav')
      ? 'vada pav stall'
      : (p.cuisineTags ?? []).includes('ice_cream')
        ? 'ice cream place'
        : null;
    noun = special ?? (cuisine ? `${pretty(cuisine)} ${TYPE_NOUN[p.type]}` : TYPE_NOUN[p.type]);
    if (p.dietFlags?.includes('pure_veg')) noun = `pure-veg ${noun}`;
  }
  const area = p.areaName?.trim() || null;
  const city = p.city?.trim() || null;
  const where = area
    ? city && !area.toLowerCase().includes(city.toLowerCase())
      ? `${area}, ${city}`
      : area
    : city;
  const sentence = `${an(noun)} ${noun}${where ? ` in ${where}` : ''}.`;
  const extra =
    p.type !== 'attraction' && p.dietFlags?.includes('jain')
      ? ' Jain food available.'
      : p.type !== 'attraction' && p.dietFlags?.includes('halal')
        ? ' Serves halal food.'
        : '';
  return sentence + extra;
}
