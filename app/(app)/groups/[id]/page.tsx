import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ActionButton } from '@/components/social/ActionButton';
import { InviteBlock } from '@/components/social/InviteBlock';
import { PersonRow } from '@/components/social/PersonRow';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { VerdictCard } from '@/components/verdict/VerdictCard';
import { addGroupMember, deleteGroup, removeGroupMember } from '@/lib/actions/groups';
import { requireOnboardedUser } from '@/lib/auth';
import { copy } from '@/lib/copy';
import { homeFeed } from '@/lib/data/feed';
import { groupMembers, myGroups } from '@/lib/data/groups';
import { myActiveInvites, myGraph, peopleById } from '@/lib/data/social';
import { siteOrigin } from '@/lib/site';

export const metadata = { title: 'Group' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function GroupContent({
  params,
  searchParams,
}: {
  params: PageProps<'/groups/[id]'>['params'];
  searchParams: PageProps<'/groups/[id]'>['searchParams'];
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID_RE.test(id)) notFound();
  const me = await requireOnboardedUser();
  const group = (await myGroups()).find((g) => g.id === id);
  if (!group) notFound();

  const cursor = typeof sp.cursor === 'string' ? sp.cursor : undefined;
  const [members, feed] = await Promise.all([groupMembers(id), homeFeed(`group:${id}`, cursor)]);
  const t = copy.groups;
  const memberIds = new Set(members.map((m) => m.id));

  // Owner: friends not yet in the group.
  let addable: Awaited<ReturnType<typeof peopleById>> = new Map();
  if (group.isOwner) {
    const graph = await myGraph();
    const friendIds = graph.friendships
      .filter((f) => f.status === 'accepted')
      .map((f) => (f.user_low === me.id ? f.user_high : f.user_low))
      .filter((fid) => !memberIds.has(fid));
    addable = await peopleById(friendIds);
  }

  return (
    <>
      <header className="pt-2">
        <Link href="/groups" className="text-primary text-sm font-semibold">
          ‹ {t.manage}
        </Link>
        <h1 className="font-display mt-2 text-2xl font-semibold">{group.name}</h1>
        <p className="text-muted text-sm">
          {[t.kinds[group.kind], t.members(group.memberCount)].join(' · ')}
        </p>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10">
        <section className="mt-6">
          <h2 className="font-display text-lg font-semibold">{t.feed}</h2>
          {feed.items.length === 0 && !cursor ? (
            <div className="mt-3">
              <EmptyState
                title={t.feedEmpty}
                body={t.feedEmptyBody}
                action={
                  <Link href="/log" className={buttonClass()}>
                    {copy.home.logFirst}
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {feed.items.map((item) => (
                <li key={item.visitId}>
                  <VerdictCard data={item} />
                </li>
              ))}
            </ul>
          )}
          {feed.nextCursor ? (
            <Link
              href={`/groups/${id}?cursor=${encodeURIComponent(feed.nextCursor)}`}
              className={buttonClass({ variant: 'ghost', fullWidth: true, className: 'mt-3' })}
            >
              {copy.home.older}
            </Link>
          ) : null}
        </section>

        <aside className="lg:sticky lg:top-8 lg:mt-6">
          <section className="mt-8 lg:mt-0">
            <h2 className="font-display text-lg font-semibold">{t.membersTitle}</h2>
            <ul className="divide-line border-line bg-surface mt-2 divide-y rounded-[var(--radius-card)] border px-4">
              {members.map((m) => (
                <PersonRow
                  key={m.id}
                  person={{ ...m, isPrivate: false }}
                  meta={m.isOwner ? t.owner : m.id === me.id ? t.you : undefined}
                >
                  {group.isOwner && !m.isOwner ? (
                    <ActionButton
                      action={removeGroupMember}
                      fields={{ groupId: id, userId: m.id }}
                      label={t.remove}
                      variant="ghost"
                    />
                  ) : null}
                </PersonRow>
              ))}
            </ul>
          </section>

          {group.isOwner ? (
            <>
              <section className="mt-8">
                <h2 className="font-display text-lg font-semibold">{t.addTitle}</h2>
                <p className="text-muted text-sm">{t.addBody}</p>
                {addable.size === 0 ? (
                  <p className="text-muted mt-2 text-sm">{t.noFriendsToAdd}</p>
                ) : (
                  <ul className="divide-line border-line bg-surface mt-2 divide-y rounded-[var(--radius-card)] border px-4">
                    {[...addable.values()].map((p) => (
                      <PersonRow key={p.id} person={p}>
                        <ActionButton
                          action={addGroupMember}
                          fields={{ groupId: id, userId: p.id }}
                          label={t.add}
                          pendingLabel={copy.social.sending}
                          doneLabel={t.added}
                        />
                      </PersonRow>
                    ))}
                  </ul>
                )}
              </section>
              <div className="mt-6">
                <GroupInvite group={{ id, name: group.name }} />
              </div>
            </>
          ) : null}

          <section className="border-line mt-10 border-t pt-6">
            {group.isOwner ? (
              <ActionButton
                action={deleteGroup}
                fields={{ groupId: id }}
                label={t.delete}
                variant="secondary"
                confirm={t.deleteConfirm(group.name)}
              />
            ) : (
              <ActionButton
                action={removeGroupMember}
                fields={{ groupId: id, userId: me.id, leaving: '1' }}
                label={t.leave}
                variant="secondary"
                confirm={t.leaveConfirm(group.name)}
              />
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

async function GroupInvite({ group }: { group: { id: string; name: string } }) {
  const latest = (await myActiveInvites(group.id))[0];
  return (
    <InviteBlock
      siteUrl={await siteOrigin()}
      existing={latest ? { code: latest.code, expiresAt: latest.expiresAt } : null}
      group={group}
    />
  );
}

export default function GroupPage(props: PageProps<'/groups/[id]'>) {
  return (
    <main>
      <Suspense
        fallback={
          <div aria-busy="true" className="mt-4 space-y-3">
            <div className="bg-line/60 h-10 w-40 animate-pulse rounded" />
            <div className="bg-line/60 h-40 animate-pulse rounded-[var(--radius-card)]" />
          </div>
        }
      >
        <GroupContent params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
