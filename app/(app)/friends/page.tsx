import Link from 'next/link';
import { Suspense } from 'react';
import { ActionButton } from '@/components/social/ActionButton';
import { InviteBlock } from '@/components/social/InviteBlock';
import { PersonRow } from '@/components/social/PersonRow';
import { RelationshipActions } from '@/components/social/RelationshipActions';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { cancelFriendRequest, respondFollow, respondFriend } from '@/lib/actions/social';
import { requireOnboardedUser } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { myActiveInvites, myGraph, peopleById, searchPeople } from '@/lib/data/social';
import { otherId, relationshipWith } from '@/lib/domain/relationship';
import { siteOrigin } from '@/lib/site';

export const metadata = { title: 'Friends' };

const TABS = ['friends', 'requests', 'find'] as const;
type Tab = (typeof TABS)[number];

function TabBar({ active, requestCount }: { active: Tab; requestCount: number }) {
  return (
    <nav aria-label="Friends sections" className="border-line mt-4 grid grid-cols-3 border-b">
      {TABS.map((t) => (
        <Link
          key={t}
          href={`/friends?tab=${t}`}
          aria-current={active === t ? 'page' : undefined}
          className={cn(
            'flex min-h-11 items-center justify-center gap-1.5 border-b-2 font-medium',
            active === t ? 'border-primary text-primary' : 'text-muted border-transparent',
          )}
        >
          {copy.friends.tabs[t]}
          {t === 'requests' && requestCount > 0 ? (
            <span className="bg-primary text-on-primary rounded-[var(--radius-pill)] px-1.5 text-xs font-bold">
              {requestCount}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

async function FriendsContent({
  searchParams,
}: {
  searchParams: PageProps<'/friends'>['searchParams'];
}) {
  const params = await searchParams;
  const tab: Tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'friends';
  const query = typeof params.q === 'string' ? params.q : '';
  const me = await requireOnboardedUser();
  const { friendships, follows } = await myGraph();

  const friendIds = friendships
    .filter((f) => f.status === 'accepted')
    .map((f) => otherId(f, me.id));
  const incoming = friendships.filter((f) => f.status === 'pending' && f.requested_by !== me.id);
  const outgoing = friendships.filter((f) => f.status === 'pending' && f.requested_by === me.id);
  const followRequests = follows.filter((f) => f.following_id === me.id && f.status === 'pending');
  const requestCount = incoming.length + followRequests.length;

  const people = await peopleById([
    ...friendIds,
    ...incoming.map((f) => otherId(f, me.id)),
    ...outgoing.map((f) => otherId(f, me.id)),
    ...followRequests.map((f) => f.follower_id),
  ]);
  const rel = (id: string) => relationshipWith(me.id, id, friendships, follows);
  const t = copy.friends;

  return (
    <>
      <TabBar active={tab} requestCount={requestCount} />
      {params.blocked ? (
        <p
          role="status"
          className="bg-public-bg text-public-fg mt-4 rounded-[var(--radius-button)] px-3 py-2 text-sm"
        >
          {t.blocked}
        </p>
      ) : null}
      {params.added ? (
        <p
          role="status"
          className="bg-go-soft text-go mt-4 rounded-[var(--radius-button)] px-3 py-2 text-sm"
        >
          {t.added}
        </p>
      ) : null}

      {tab === 'friends' ? (
        friendIds.length === 0 ? (
          <div className="mt-6 space-y-4">
            <EmptyState title={t.emptyFriends} body={t.emptyFriendsBody} />
            <InviteSection />
          </div>
        ) : (
          <ul className="divide-line mt-2 divide-y">
            {friendIds.map((id) => {
              const p = people.get(id);
              return p ? (
                <PersonRow
                  key={id}
                  person={p}
                  meta={rel(id).followsYou ? t.followsYou : undefined}
                />
              ) : null;
            })}
          </ul>
        )
      ) : null}

      {tab === 'requests' ? (
        requestCount === 0 && outgoing.length === 0 ? (
          <div className="mt-6">
            <EmptyState title={t.emptyRequests} />
          </div>
        ) : (
          <div className="mt-2 space-y-6">
            {incoming.length > 0 ? (
              <section>
                <h2 className="text-muted mt-4 text-sm font-semibold">{t.incomingFriends}</h2>
                <ul className="divide-line divide-y">
                  {incoming.map((f) => {
                    const id = otherId(f, me.id);
                    const p = people.get(id);
                    return p ? (
                      <PersonRow key={id} person={p}>
                        <ActionButton
                          action={respondFriend}
                          fields={{ userId: id, accept: 'false' }}
                          label={copy.social.decline}
                          variant="ghost"
                        />
                        <ActionButton
                          action={respondFriend}
                          fields={{ userId: id, accept: 'true' }}
                          label={copy.social.accept}
                          variant="primary"
                        />
                      </PersonRow>
                    ) : null;
                  })}
                </ul>
              </section>
            ) : null}
            {followRequests.length > 0 ? (
              <section>
                <h2 className="text-muted mt-4 text-sm font-semibold">{t.followRequests}</h2>
                <ul className="divide-line divide-y">
                  {followRequests.map((f) => {
                    const p = people.get(f.follower_id);
                    return p ? (
                      <PersonRow key={f.follower_id} person={p}>
                        <ActionButton
                          action={respondFollow}
                          fields={{ userId: f.follower_id, accept: 'false' }}
                          label={copy.social.remove}
                          variant="ghost"
                        />
                        <ActionButton
                          action={respondFollow}
                          fields={{ userId: f.follower_id, accept: 'true' }}
                          label={copy.social.approve}
                          variant="primary"
                        />
                      </PersonRow>
                    ) : null;
                  })}
                </ul>
              </section>
            ) : null}
            {outgoing.length > 0 ? (
              <section>
                <h2 className="text-muted mt-4 text-sm font-semibold">{t.outgoingFriends}</h2>
                <ul className="divide-line divide-y">
                  {outgoing.map((f) => {
                    const id = otherId(f, me.id);
                    const p = people.get(id);
                    return p ? (
                      <PersonRow key={id} person={p}>
                        <ActionButton
                          action={cancelFriendRequest}
                          fields={{ userId: id }}
                          label={copy.social.cancel}
                          variant="ghost"
                        />
                      </PersonRow>
                    ) : null;
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        )
      ) : null}

      {tab === 'find' ? <FindTab query={query} viewerId={me.id} rel={rel} /> : null}
    </>
  );
}

async function FindTab({
  query,
  viewerId,
  rel,
}: {
  query: string;
  viewerId: string;
  rel: (id: string) => ReturnType<typeof relationshipWith>;
}) {
  const results = await searchPeople(query, viewerId);
  const t = copy.friends;
  return (
    <div className="mt-4 space-y-5">
      <form action="/friends" role="search">
        <input type="hidden" name="tab" value="find" />
        <label htmlFor="people-q" className="mb-1.5 block font-semibold">
          {t.searchLabel}
        </label>
        <input
          id="people-q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder={t.searchPlaceholder}
          autoComplete="off"
          autoCapitalize="none"
          enterKeyHint="search"
          className="border-line bg-surface focus:border-primary min-h-12 w-full rounded-[var(--radius-button)] border-2 px-3 focus:outline-none"
        />
      </form>
      {query.trim().length >= 2 ? (
        results.length === 0 ? (
          <p className="text-muted text-sm">{t.noResults}</p>
        ) : (
          <ul className="divide-line divide-y">
            {results.map((p) => (
              <PersonRow key={p.id} person={p}>
                <RelationshipActions userId={p.id} rel={rel(p.id)} path="/friends?tab=find" />
              </PersonRow>
            ))}
          </ul>
        )
      ) : null}
      <InviteSection />
    </div>
  );
}

async function InviteSection() {
  const invites = await myActiveInvites();
  const latest = invites[0];
  return (
    <InviteBlock
      siteUrl={await siteOrigin()}
      existing={latest ? { code: latest.code, expiresAt: latest.expiresAt } : null}
    />
  );
}

export default function FriendsPage(props: PageProps<'/friends'>) {
  return (
    <main className="mx-auto w-full lg:max-w-2xl">
      <div className="flex items-center justify-between pt-2">
        <h1 className="font-display text-2xl font-semibold">{copy.friends.title}</h1>
        <Link
          href="/groups"
          className={buttonClass({ variant: 'secondary', className: 'text-sm' })}
        >
          {copy.groups.manage}
        </Link>
      </div>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="bg-line/60 mt-6 h-40 animate-pulse rounded-[var(--radius-card)]"
          />
        }
      >
        <FriendsContent searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
