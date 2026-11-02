// Relationship state between the viewer and another person, from the viewer's own rows.
// Drives which buttons a profile or person row shows (UI_UX.md §4.6).

export type FriendRow = {
  user_low: string;
  user_high: string;
  requested_by: string;
  status: 'pending' | 'accepted';
};

export type FollowRow = {
  follower_id: string;
  following_id: string;
  status: 'pending' | 'accepted';
};

export type FriendState = 'self' | 'friends' | 'request_sent' | 'request_received' | 'none';
export type FollowState = 'following' | 'requested' | 'none';

export type Relationship = {
  friend: FriendState;
  follow: FollowState; // viewer -> other
  followsYou: boolean; // other -> viewer, accepted
  followRequestFromThem: boolean; // other -> viewer, pending
};

export function relationshipWith(
  viewerId: string,
  otherId: string,
  friendships: readonly FriendRow[],
  follows: readonly FollowRow[],
): Relationship {
  if (viewerId === otherId) {
    return { friend: 'self', follow: 'none', followsYou: false, followRequestFromThem: false };
  }
  const lo = viewerId < otherId ? viewerId : otherId;
  const hi = viewerId < otherId ? otherId : viewerId;
  const f = friendships.find((r) => r.user_low === lo && r.user_high === hi);
  const friend: FriendState = !f
    ? 'none'
    : f.status === 'accepted'
      ? 'friends'
      : f.requested_by === viewerId
        ? 'request_sent'
        : 'request_received';

  const out = follows.find((r) => r.follower_id === viewerId && r.following_id === otherId);
  const inc = follows.find((r) => r.follower_id === otherId && r.following_id === viewerId);
  return {
    friend,
    follow: !out ? 'none' : out.status === 'accepted' ? 'following' : 'requested',
    followsYou: inc?.status === 'accepted',
    followRequestFromThem: inc?.status === 'pending',
  };
}

/** The other person in a friendship row. */
export function otherId(row: FriendRow, viewerId: string): string {
  return row.user_low === viewerId ? row.user_high : row.user_low;
}
