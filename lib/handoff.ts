// Swiggy / Zomato handoff (PLACES_DATA.md §9). A plain search link, never scraping, never an
// undocumented API. Hidden for street stalls, unverified user-added places, closed places,
// and whenever the flags are off. The URL templates are placeholders until the human tests
// real link formats on iOS and Android and fills them in (do not guess).
import type { PlaceType } from '@/lib/domain/place';

export type HandoffTarget = 'swiggy' | 'zomato';

export const HANDOFF_TEMPLATES: Record<HandoffTarget, ((q: string) => string) | null> = {
  // TODO(human): verify on real devices, then replace null with e.g. (q) => `https://…?query=${encodeURIComponent(q)}`
  swiggy: null,
  zomato: null,
};

const HANDOFF_TYPES: readonly PlaceType[] = ['restaurant', 'cafe', 'bakery', 'sweet_shop'];

type PlaceForHandoff = {
  name: string;
  areaName: string | null;
  type: PlaceType;
  status: 'unverified' | 'confirmed' | 'merged' | 'closed';
  source?: 'osm' | 'google' | 'user';
};

/** Whether the place is a kind we are confident enough to hand off at all. */
export function handoffAllowed(place: PlaceForHandoff): boolean {
  if (!HANDOFF_TYPES.includes(place.type)) return false;
  if (place.status === 'closed' || place.status === 'merged') return false;
  if (place.status === 'unverified' && place.source === 'user') return false;
  return true;
}

/** The link, or null when hidden (flag off, template not verified, or place not allowed). */
export function handoffUrl(
  target: HandoffTarget,
  place: PlaceForHandoff,
  enabled: boolean,
  templates: Record<HandoffTarget, ((q: string) => string) | null> = HANDOFF_TEMPLATES,
): string | null {
  const template = templates[target];
  if (!enabled || !template || !handoffAllowed(place)) return null;
  const q = [place.name, place.areaName].filter(Boolean).join(' ');
  return template(q);
}
