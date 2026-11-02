import {
  cancelFriendRequest,
  followUser,
  requestFriend,
  respondFriend,
  unfollowUser,
} from '@/lib/actions/social';
import { copy } from '@/lib/copy';
import type { Relationship } from '@/lib/domain/relationship';
import { ActionButton } from './ActionButton';

/**
 * Buttons for one person by relationship state (UI_UX.md §4.6):
 *   stranger      [Follow] [Add friend]
 *   following     [Following] [Add friend]
 *   request sent  [Requested]
 *   they asked    [Accept]
 *   friends       nothing in lists (unfriend/block live in the profile menu)
 */
export function RelationshipActions({
  userId,
  rel,
  path,
}: {
  userId: string;
  rel: Relationship;
  path?: string;
}) {
  const fields = { userId, ...(path ? { path } : {}) };
  const t = copy.social;

  switch (rel.friend) {
    case 'self':
    case 'friends':
      return null;
    case 'request_received':
      return (
        <ActionButton
          action={respondFriend}
          fields={{ ...fields, accept: 'true' }}
          label={t.accept}
          variant="primary"
        />
      );
    case 'request_sent':
      return (
        <ActionButton
          action={cancelFriendRequest}
          fields={fields}
          label={t.requested}
          variant="ghost"
        />
      );
    case 'none':
      return (
        <>
          {rel.follow === 'none' ? (
            <ActionButton action={followUser} fields={fields} label={t.follow} variant="ghost" />
          ) : (
            <ActionButton
              action={unfollowUser}
              fields={fields}
              label={rel.follow === 'following' ? t.following : t.followRequested}
              variant="ghost"
            />
          )}
          <ActionButton
            action={requestFriend}
            fields={fields}
            label={t.addFriend}
            pendingLabel={t.sending}
          />
        </>
      );
  }
}
