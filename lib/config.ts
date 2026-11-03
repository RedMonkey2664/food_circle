// Single home for the working title and feature flags (CLAUDE.md: name lives in one constant).
export const APP_NAME = 'Food Circle';
export const APP_TAGLINE = 'Eat where your people eat.';

function flag(value: string | undefined): boolean {
  return value === 'true';
}

export const FLAGS = {
  googlePlaces: flag(process.env.GOOGLE_PLACES_ENABLED),
  handoffSwiggy: flag(process.env.NEXT_PUBLIC_HANDOFF_SWIGGY_ENABLED),
  handoffZomato: flag(process.env.NEXT_PUBLIC_HANDOFF_ZOMATO_ENABLED),
  leaderboards: flag(process.env.NEXT_PUBLIC_LEADERBOARDS_ENABLED),
} as const;

/**
 * Map tiles (Phase 5). Default: OpenFreeMap's OSM-based "liberty" style: free, no API key,
 * no account (CLAUDE.md: never require a paid map key). Override with NEXT_PUBLIC_MAP_STYLE_URL.
 */
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

/** Greater Mumbai centre, for maps with nothing else to show. */
export const MUMBAI_CENTER = { lat: 19.076, lng: 72.8777 } as const;
