// Relationship tiers (PRODUCT_SPEC.md §6). Tiers are disjoint and never blended.
export const TIERS = ['friend', 'following', 'public'] as const;
export type Tier = (typeof TIERS)[number];

/** Tag text shown on every verdict. Always text, never colour alone. */
export const TIER_TAG_LABEL: Record<Tier, string> = {
  friend: 'FRIEND',
  following: 'Following',
  public: 'Public',
};

/** Heading used for the tier's row in a place summary. */
export const TIER_SUMMARY_HEADING: Record<Tier, string> = {
  friend: 'Friends',
  following: 'Following',
  public: 'Everyone',
};

/** Maps the database tier number (relationship_tier: 1 friend, 2 following, 3 everyone). */
export function tierFromNumber(n: number): Tier | null {
  switch (n) {
    case 1:
      return 'friend';
    case 2:
      return 'following';
    case 3:
      return 'public';
    default:
      return null;
  }
}
