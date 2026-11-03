import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { DietBadges } from '@/components/place/DietBadges';
import { CircleOpenLink } from '@/components/motion/CircleLink';
import { RememberPlace } from '@/components/place/RecentPlaces';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { TierSummary } from '@/components/verdict/TierSummary';
import { VerdictCard } from '@/components/verdict/VerdictCard';
import { VerdictLabel } from '@/components/verdict/VerdictLabel';
import { requireOnboardedUser } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { FLAGS } from '@/lib/config';
import { copy } from '@/lib/copy';
import {
  getPlace,
  getPlaceSummary,
  getPlaceVerdicts,
  hasFriends,
  type PlaceVerdict,
  type TierFilter,
} from '@/lib/data/places';
import { PLACE_TYPE_LABEL, cuisineLabel } from '@/lib/domain/place';
import { TIER_SUMMARY_HEADING } from '@/lib/domain/tiers';
import { visitAge } from '@/lib/domain/time';
import { handoffUrl } from '@/lib/handoff';
import { placeTopDishes } from '@/lib/data/details';
import { myWantToGoIds } from '@/lib/data/diary';
import { PlaceFixes } from '@/components/place/PlaceFixes';
import { WantToGoButton } from '@/components/place/WantToGoButton';

const FILTERS: TierFilter[] = ['friends', 'friends_following', 'everyone'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function FilterToggle({ placeId, active }: { placeId: string; active: TierFilter }) {
  return (
    <nav
      aria-label={copy.place.filterLabel}
      className="bg-surface border-line grid grid-cols-3 gap-1 rounded-[var(--radius-button)] border p-1"
    >
      {FILTERS.map((f) => (
        <Link
          key={f}
          href={`/place/${placeId}?filter=${f}`}
          scroll={false}
          aria-current={active === f ? 'true' : undefined}
          className={cn(
            'flex min-h-11 items-center justify-center rounded-[10px] px-1 text-center text-sm leading-tight font-medium',
            active === f ? 'bg-primary text-on-primary' : 'text-muted hover:bg-primary-soft',
          )}
        >
          {copy.place.filters[f]}
        </Link>
      ))}
    </nav>
  );
}

function Section({ title, items }: { title: string; items: PlaceVerdict[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-muted text-xs font-bold tracking-wide uppercase">{title}</h2>
      <ul className="space-y-2">
        {items.map((v) => (
          <li key={v.visitId}>
            <VerdictCard data={v} />
          </li>
        ))}
      </ul>
    </section>
  );
}

async function PlaceContent({
  params,
  searchParams,
}: {
  params: PageProps<'/place/[id]'>['params'];
  searchParams: PageProps<'/place/[id]'>['searchParams'];
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID_RE.test(id)) notFound();
  const filter: TierFilter = FILTERS.includes(sp.filter as TierFilter)
    ? (sp.filter as TierFilter)
    : 'friends_following';
  await requireOnboardedUser();

  const place = await getPlace(id);
  if (!place) notFound();
  if (place.mergedFrom) redirect(`/place/${place.id}`);

  const [summary, verdicts, friendsExist, topDishes, wantIds] = await Promise.all([
    getPlaceSummary(place.id),
    getPlaceVerdicts(place.id, filter),
    hasFriends(),
    placeTopDishes(place.id),
    myWantToGoIds(),
  ]);

  const mine = verdicts.find((v) => v.tierNumber === 0);
  const byTier = (n: number) => verdicts.filter((v) => v.tierNumber === n);
  const friends = byTier(1);
  const following = byTier(2);
  const everyone = byTier(3);
  const others = friends.length + following.length + everyone.length;
  const t = copy.place;

  const handoff = (['swiggy', 'zomato'] as const)
    .map((target) => ({
      target,
      url: handoffUrl(
        target,
        { name: place.name, areaName: place.areaName, type: place.type, status: place.status },
        target === 'swiggy' ? FLAGS.handoffSwiggy : FLAGS.handoffZomato,
      ),
    }))
    .filter((h): h is { target: 'swiggy' | 'zomato'; url: string } => h.url !== null);

  return (
    <>
      <RememberPlace place={{ id: place.id, name: place.name, areaName: place.areaName }} />
      {/* PC: summary + action pinned left, verdicts right. iPad/phone: one column. */}
      <div className="lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-10">
        <div className="lg:sticky lg:top-8">
          <header className="pt-2">
            <h1 className="font-display text-2xl leading-tight font-semibold md:text-3xl">
              {place.name}
            </h1>
            <p className="text-muted mt-1">
              {[
                place.areaName,
                PLACE_TYPE_LABEL[place.type],
                ...place.cuisineTags.slice(0, 2).map(cuisineLabel),
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
            {place.status === 'closed' ? (
              <p className="text-warn mt-1 text-sm font-medium">{t.closed}</p>
            ) : null}
            {place.status === 'unverified' ? (
              <p className="text-muted mt-1 text-sm">{copy.placeExtra.unverified}</p>
            ) : null}
            <div className="mt-3">
              <DietBadges flags={place.dietFlags} />
            </div>
          </header>

          {mine ? (
            <p className="bg-surface border-line mt-4 flex items-center justify-between gap-2 rounded-[var(--radius-button)] border px-3 py-2 text-sm">
              <span>
                {t.yourLast} <VerdictLabel verdict={mine.verdict} onlyForText={mine.onlyForText} />
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-muted">{visitAge(mine.visitedOn)}</span>
                <Link href={`/visit/${mine.visitId}`} className="text-primary font-semibold">
                  {mine.details ? copy.review.editDetails : copy.review.addDetails}
                </Link>
              </span>
            </p>
          ) : null}

          <div className="mt-4">
            <TierSummary summary={summary} />
          </div>

          {!mine ? (
            <div className="mt-3">
              <WantToGoButton placeId={place.id} initialSaved={wantIds.has(place.id)} />
            </div>
          ) : null}

          {[1, 2, 3].some((n) => topDishes.get(n)?.length) ? (
            <section className="border-line bg-surface mt-4 rounded-[var(--radius-card)] border p-3">
              <h2 className="text-sm font-bold">{copy.review.topDishes}</h2>
              {/* Tiers stay separate: one list per tier, never merged. */}
              <dl className="mt-2 space-y-2">
                {([1, 2, 3] as const).map((n) => {
                  const list = topDishes.get(n);
                  if (!list?.length) return null;
                  const heading =
                    TIER_SUMMARY_HEADING[n === 1 ? 'friend' : n === 2 ? 'following' : 'public'];
                  return (
                    <div key={n}>
                      <dt className="text-muted text-xs font-bold tracking-wide uppercase">
                        {heading}
                      </dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {list.map((d) => (
                          <span
                            key={d.name}
                            className="bg-bg rounded-full px-2.5 py-1 text-xs font-medium"
                          >
                            {d.name}{' '}
                            <span className="text-muted">
                              ({copy.review.dishVotes(d.go, d.skip)})
                            </span>
                          </span>
                        ))}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ) : null}

          {/* iPad/PC: the primary action sits inline (phones get the sticky bar below). */}
          <div className="mt-5 hidden md:block">
            <CircleOpenLink
              href={`/log?place=${place.id}`}
              className={buttonClass({ size: 'lg', fullWidth: true })}
            >
              {t.ateHere}
            </CircleOpenLink>
          </div>

          {handoff.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-2">
              {handoff.map((h) => (
                <a
                  key={h.target}
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass({ variant: 'secondary' })}
                >
                  {t.handoff[h.target]}
                </a>
              ))}
            </div>
          ) : null}

          <PlaceFixes placeId={place.id} />
        </div>

        <div>
          <div className="mt-4 lg:mt-2">
            <FilterToggle placeId={place.id} active={filter} />
          </div>

          <div className="mt-5 space-y-6">
            <Section title={TIER_SUMMARY_HEADING.friend} items={friends} />
            <Section title={TIER_SUMMARY_HEADING.following} items={following} />
            {everyone.length > 0 ? (
              <details
                className="group"
                open={filter === 'everyone' && friends.length + following.length === 0}
              >
                <summary
                  className={buttonClass({
                    variant: 'ghost',
                    fullWidth: true,
                    className: 'list-none [&::-webkit-details-marker]:hidden',
                  })}
                >
                  <span className="group-open:hidden">{t.showMore(everyone.length)}</span>
                  <span className="hidden group-open:inline">{t.showLess}</span>
                </summary>
                <div className="mt-3">
                  <Section title={TIER_SUMMARY_HEADING.public} items={everyone} />
                </div>
              </details>
            ) : null}

            {others === 0 ? (
              friendsExist ? (
                <EmptyState
                  title={filter === 'friends' ? t.emptyFriends : t.emptyCircle}
                  body={filter === 'everyone' ? t.emptyEveryoneBody : t.emptyCircleBody}
                  action={
                    filter !== 'everyone' ? (
                      <Link
                        href={`/place/${place.id}?filter=everyone`}
                        className={buttonClass({ variant: 'secondary' })}
                      >
                        {t.seeEveryone}
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <EmptyState
                  title={t.noFriendsTitle}
                  body={t.noFriendsBody}
                  action={
                    <div className="flex flex-wrap gap-2">
                      <Link href="/friends?tab=find" className={buttonClass()}>
                        {copy.home.findFriends}
                      </Link>
                      {filter !== 'everyone' && summary.tiers.public ? (
                        <Link
                          href={`/place/${place.id}?filter=everyone`}
                          className={buttonClass({ variant: 'secondary' })}
                        >
                          {t.seeEveryone}
                        </Link>
                      ) : null}
                    </div>
                  }
                />
              )
            ) : null}
          </div>
        </div>
      </div>

      {/* Phones: sticky primary action above the bottom nav. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 md:hidden">
        <div className="mx-auto max-w-[480px] px-4">
          <CircleOpenLink
            href={`/log?place=${place.id}`}
            className={buttonClass({
              size: 'lg',
              fullWidth: true,
              className: 'pointer-events-auto shadow-lg',
            })}
          >
            {t.ateHere}
          </CircleOpenLink>
        </div>
      </div>
      <div className="h-20 md:hidden" aria-hidden />
    </>
  );
}

export async function generateMetadata(props: PageProps<'/place/[id]'>) {
  const { id } = await props.params;
  if (!UUID_RE.test(id)) return { title: copy.search.title };
  const place = await getPlace(id);
  return { title: place?.name ?? copy.search.title };
}

export default function PlacePage(props: PageProps<'/place/[id]'>) {
  return (
    <main>
      <Suspense
        fallback={
          <div aria-busy="true" className="space-y-3 pt-2">
            <div className="bg-line h-8 w-2/3 animate-pulse rounded-md" />
            <div className="bg-line/60 h-36 animate-pulse rounded-[var(--radius-card)]" />
            <div className="bg-line/60 h-24 animate-pulse rounded-[var(--radius-card)]" />
          </div>
        }
      >
        <PlaceContent params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
