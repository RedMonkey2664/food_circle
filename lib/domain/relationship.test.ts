import { describe, expect, it } from 'vitest';
import { otherId, relationshipWith, type FollowRow, type FriendRow } from './relationship';

const A = 'aaaaaaaa-0000-0000-0000-000000000000';
const B = 'bbbbbbbb-0000-0000-0000-000000000000';

const fr = (status: FriendRow['status'], requested_by: string): FriendRow => ({
  user_low: A,
  user_high: B,
  requested_by,
  status,
});

describe('relationshipWith', () => {
  it('recognises yourself', () => {
    expect(relationshipWith(A, A, [], []).friend).toBe('self');
  });
  it('distinguishes sent and received requests', () => {
    expect(relationshipWith(A, B, [fr('pending', A)], []).friend).toBe('request_sent');
    expect(relationshipWith(A, B, [fr('pending', B)], []).friend).toBe('request_received');
    expect(relationshipWith(B, A, [fr('accepted', A)], []).friend).toBe('friends');
  });
  it('reads follow state in both directions', () => {
    const follows: FollowRow[] = [
      { follower_id: A, following_id: B, status: 'pending' },
      { follower_id: B, following_id: A, status: 'accepted' },
    ];
    expect(relationshipWith(A, B, [], follows)).toEqual({
      friend: 'none',
      follow: 'requested',
      followsYou: true,
      followRequestFromThem: false,
    });
  });
});

describe('otherId', () => {
  it('returns the other side of the row', () => {
    expect(otherId(fr('accepted', A), A)).toBe(B);
    expect(otherId(fr('accepted', A), B)).toBe(A);
  });
});
