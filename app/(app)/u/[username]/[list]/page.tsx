import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ActionButton } from '@/components/social/ActionButton';
import { PersonRow } from '@/components/social/PersonRow';
import { removeFollower, unfollowUser } from '@/lib/actions/social';
import { requireOnboardedUser } from '@/lib/auth';
import { copy } from '@/lib/copy';
import { myGraph, peopleById } from '@/lib/data/social';

// Your own followers / following lists (P1-04). Relationship rows are only readable by the
// two people involved (RLS), so other people's lists are not shown in Phase 1.
async function ListContent({ params }: { params: PageProps<'/u/[username]/[list]'>['params'] }) {
  const { username, list } = await params;
  if (list !== 'followers' && list !== 'following') notFound();
  const me = await requireOnboardedUser();
  if (decodeURIComponent(username).toLowerCase() !== me.username.toLowerCase()) notFound();

  const { follows } = await myGraph();
  const rows =
    list === 'followers'
      ? follows.filter((f) => f.following_id === me.id && f.status === 'accepted')
      : follows.filter((f) => f.follower_id === me.id);
  const ids = rows.map((r) => (list === 'followers' ? r.follower_id : r.following_id));
  const people = await peopleById(ids);
  const t = copy.profile;
  const path = `/u/${me.username}/${list}`;

  return (
    <>
      <Link href={`/u/${me.username}`} className="text-muted text-sm hover:underline">
        ← @{me.username}
      </Link>
      <h1 className="font-display mt-2 text-2xl font-semibold">
        {list === 'followers' ? t.youFollow : t.youAreFollowing}
      </h1>
      {ids.length === 0 ? (
        <p className="text-muted mt-6">{t.listEmpty}</p>
      ) : (
        <ul className="divide-line mt-2 divide-y">
          {rows.map((r) => {
            const id = list === 'followers' ? r.follower_id : r.following_id;
            const p = people.get(id);
            if (!p) return null;
            return (
              <PersonRow
                key={id}
                person={p}
                meta={r.status === 'pending' ? copy.social.followRequested : undefined}
              >
                {list === 'followers' ? (
                  <ActionButton
                    action={removeFollower}
                    fields={{ userId: id, path }}
                    label={copy.social.remove}
                    variant="ghost"
                  />
                ) : (
                  <ActionButton
                    action={unfollowUser}
                    fields={{ userId: id, path }}
                    label={copy.social.following}
                    variant="ghost"
                  />
                )}
              </PersonRow>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function FollowListPage(props: PageProps<'/u/[username]/[list]'>) {
  return (
    <main className="mx-auto w-full pt-2 lg:max-w-2xl">
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="bg-line/60 h-40 animate-pulse rounded-[var(--radius-card)]"
          />
        }
      >
        <ListContent params={props.params} />
      </Suspense>
    </main>
  );
}
