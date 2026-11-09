import Link from 'next/link';
import { Suspense } from 'react';
import { PersonRow } from '@/components/social/PersonRow';
import { RelationshipActions } from '@/components/social/RelationshipActions';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { requireOnboardedUser } from '@/lib/auth';
import { copy } from '@/lib/copy';
import {
  discoverPeople,
  myHomeArea,
  refreshMyTasteMatches,
  type DiscoverPerson,
} from '@/lib/data/discover';
import { myGraph } from '@/lib/data/social';
import { relationshipWith, type FollowRow, type FriendRow } from '@/lib/domain/relationship';
import { PageTitle } from '@/components/brand/Sticker';
import { PlacesTab } from '@/components/discover/PlacesTab';
import { NavPill } from '@/components/motion/NavPill';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Discover' };

type Section = {
  key: string;
  title: string;
  people: DiscoverPerson[];
  meta: (p: DiscoverPerson) => string | undefined;
};

function PeopleList({
  people,
  meta,
  viewerId,
  graph,
}: {
  people: DiscoverPerson[];
  meta: Section['meta'];
  viewerId: string;
  graph: { friendships: FriendRow[]; follows: FollowRow[] };
}) {
  return (
    <ul className="divide-line divide-y">
      {people.map((p) => (
        <PersonRow key={p.id} person={p} meta={meta(p)}>
          <RelationshipActions
            userId={p.id}
            rel={relationshipWith(viewerId, p.id, graph.friendships, graph.follows)}
            path="/discover"
          />
        </PersonRow>
      ))}
    </ul>
  );
}

async function DiscoverContent({
  searchParams,
}: {
  searchParams: PageProps<'/discover'>['searchParams'];
}) {
  const { q } = await searchParams;
  const query = typeof q === 'string' ? q.trim() : '';
  const me = await requireOnboardedUser();
  const t = copy.discover;

  // Lazy taste-match refresh (P2-03): cheap for one person, keeps "Taste twins" current.
  await refreshMyTasteMatches();
  const [graph, home] = await Promise.all([myGraph(), myHomeArea(me.id)]);

  if (query.length >= 2) {
    const results = await discoverPeople('search', query, 20);
    return (
      <>
        <SearchBox query={query} />
        {results.length === 0 ? (
          <p className="text-muted mt-4 text-sm">{t.noResults}</p>
        ) : (
          <div className="mt-2">
            <PeopleList people={results} meta={() => undefined} viewerId={me.id} graph={graph} />
          </div>
        )}
      </>
    );
  }

  const [taste, near, fof, vegOnly, jain, vadaPav, irani, active] = await Promise.all([
    discoverPeople('taste', null, 6),
    home ? discoverPeople('area', home.slug, 6) : Promise.resolve([]),
    discoverPeople('friends_of_friends', null, 6),
    discoverPeople('diet', 'veg', 6),
    discoverPeople('diet', 'jain', 6),
    discoverPeople('cuisine', 'vada_pav', 6),
    discoverPeople('cuisine', 'irani_cafe', 6),
    discoverPeople('suggested', null, 6),
  ]);

  // Veg and Jain foodies: union of both diets, best-ranked first, no duplicates.
  const veg = [
    ...new Map(
      [...vegOnly, ...jain]
        .sort((a: DiscoverPerson, b: DiscoverPerson) => b.score - a.score)
        .map((p) => [p.id, p]),
    ).values(),
  ].slice(0, 6);

  const sections: Section[] = [
    {
      key: 'taste',
      title: t.sections.taste,
      people: taste,
      meta: (p: DiscoverPerson) => (p.matchRate !== null ? t.match(p.matchRate) : undefined),
    },
    ...(home
      ? [
          {
            key: 'near',
            title: t.sections.near(home.name),
            people: near,
            meta: (p: DiscoverPerson) => t.placesIn(p.score, home.name),
          },
        ]
      : []),
    {
      key: 'fof',
      title: t.sections.fof,
      people: fof,
      meta: (p: DiscoverPerson) => t.mutual(p.score),
    },
    {
      key: 'veg',
      title: t.sections.veg,
      people: veg,
      meta: (p: DiscoverPerson) => t.places(p.score),
    },
    {
      key: 'vada',
      title: t.sections.vadaPav,
      people: vadaPav,
      meta: (p: DiscoverPerson) => t.places(p.score),
    },
    {
      key: 'irani',
      title: t.sections.irani,
      people: irani,
      meta: (p: DiscoverPerson) => t.places(p.score),
    },
    {
      key: 'active',
      title: t.sections.active,
      people: active,
      meta: (p: DiscoverPerson) => t.places(p.score),
    },
  ].filter((s) => s.people.length > 0);

  return (
    <>
      <SearchBox query="" />
      {taste.length === 0 ? <p className="text-muted mt-3 text-sm">{t.tasteHint}</p> : null}
      {sections.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t.emptyTitle}
            body={t.emptyBody}
            action={
              <Link href="/friends?tab=find" className={buttonClass()}>
                {copy.home.findFriends}
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-4 space-y-8 md:mt-6 md:grid md:grid-cols-1 md:gap-5 md:space-y-0 lg:grid-cols-2">
          {sections.map((s) => (
            <section
              key={s.key}
              className="md:border-line md:bg-surface md:rounded-[var(--radius-card)] md:border md:px-4 md:py-3"
            >
              <h2 className="font-display text-lg font-semibold">{s.title}</h2>
              <PeopleList people={s.people} meta={s.meta} viewerId={me.id} graph={graph} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function SearchBox({ query }: { query: string }) {
  return (
    <form action="/discover" role="search" className="mt-3 md:max-w-xl">
      <label htmlFor="discover-q" className="sr-only">
        {copy.discover.searchLabel}
      </label>
      <input
        id="discover-q"
        name="q"
        type="search"
        defaultValue={query}
        placeholder={copy.discover.searchPlaceholder}
        autoComplete="off"
        autoCapitalize="none"
        enterKeyHint="search"
        className="border-line bg-surface focus:border-primary min-h-12 w-full rounded-[var(--radius-button)] border-2 px-3 focus:outline-none"
      />
    </form>
  );
}

/** Friends (people) or Places, as tabs with the gliding underline. */
async function DiscoverBody({
  searchParams,
}: {
  searchParams: PageProps<'/discover'>['searchParams'];
}) {
  const { tab } = await searchParams;
  const active = tab === 'places' ? 'places' : 'friends';
  const t = copy.discoverPlaces;
  const tabs = [
    { key: 'friends', href: '/discover', label: t.friendsTab },
    { key: 'places', href: '/discover?tab=places', label: t.placesTab },
  ] as const;
  return (
    <>
      <nav
        aria-label={t.tabsLabel}
        className="border-line relative mt-3 grid grid-cols-2 border-b md:max-w-md"
      >
        <NavPill fit="underline" className="bg-primary rounded-full" />
        {tabs.map((x) => (
          <Link
            key={x.key}
            href={x.href}
            aria-current={active === x.key ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center justify-center font-medium',
              active === x.key ? 'text-primary' : 'text-muted',
            )}
          >
            {x.label}
          </Link>
        ))}
      </nav>
      {active === 'places' ? <PlacesTab /> : <DiscoverContent searchParams={searchParams} />}
    </>
  );
}

export default function DiscoverPage(props: PageProps<'/discover'>) {
  return (
    <main className="pt-2">
      <PageTitle sticker="eyes" tilt={-6}>
        {copy.discover.title}
      </PageTitle>
      <Suspense
        fallback={
          <div aria-busy="true" className="mt-3 space-y-3">
            <div className="bg-line/60 h-12 animate-pulse rounded-[var(--radius-button)]" />
            <div className="bg-line/60 h-40 animate-pulse rounded-[var(--radius-card)]" />
          </div>
        }
      >
        <DiscoverBody searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
