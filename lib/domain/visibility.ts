import { APP_NAME } from '@/lib/config';

// Visit visibility (PRODUCT_SPEC.md §5). Narrower audience wins by default.
export const VISIBILITIES = ['private', 'friends', 'followers', 'public'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  private: 'Only me',
  friends: 'Friends',
  followers: 'Followers',
  public: 'Public',
};

/** Default entry visibility for a new account type. */
export function defaultVisibility(isPrivateAccount: boolean): Visibility {
  return isPrivateAccount ? 'friends' : 'followers';
}

/** Choices offered for an account. Private accounts never offer Public. */
export function visibilityOptions(isPrivateAccount: boolean): Visibility[] {
  return isPrivateAccount ? ['private', 'friends', 'followers'] : [...VISIBILITIES];
}

type Counts = { friends?: number; followers?: number };

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The plain sentence shown under every visibility picker ("who can see this").
 * Counts are optional: without them the sentence stays generic.
 */
export function whoCanSee(v: Visibility, isPrivateAccount: boolean, counts: Counts = {}): string {
  const friends =
    counts.friends === undefined
      ? 'your friends'
      : `your ${plural(counts.friends, 'friend', 'friends')}`;
  const followers =
    counts.followers === undefined
      ? 'your followers'
      : plural(counts.followers, 'follower', 'followers');
  switch (v) {
    case 'private':
      return 'Only you can see this.';
    case 'friends':
      return `Visible to ${friends}.`;
    case 'followers':
      return `Visible to ${friends} and ${followers}.`;
    case 'public':
      return isPrivateAccount
        ? `Visible to ${friends} and ${followers} (your account is private).`
        : `Visible to anyone on ${APP_NAME}.`;
  }
}

/** Friends visibility narrowed to groups (Phase 3): "Visible only to your friends in Family." */
export function whoCanSeeGroups(groupNames: readonly string[]): string {
  const names = groupNames.filter(Boolean);
  if (names.length === 0) return whoCanSee('friends', false);
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `Visible only to your friends in ${list}.`;
}
