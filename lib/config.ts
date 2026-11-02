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
