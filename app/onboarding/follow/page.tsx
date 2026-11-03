import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { PersonRow } from '@/components/social/PersonRow';
import { RelationshipActions } from '@/components/social/RelationshipActions';
import { buttonClass } from '@/components/ui/Button';
import { requireOnboardedUser } from '@/lib/auth';
import { copy } from '@/lib/copy';
import { discoverPeople, myHomeArea, type DiscoverPerson } from '@/lib/data/discover';
import { myGraph } from '@/lib/data/social';
import { safeNextPath } from '@/lib/domain/redirect';
import { relationshipWith } from '@/lib/domain/relationship';

export const metadata = { title: 'Follow people' };

/**
 * P2-06: right after onboarding, suggest up to 5 real people to follow (home area first,
 * then the most active). Fewer than 5 is fine; none at all skips straight on.
 */
async function FollowStep({
  searchParams,
}: {
  searchParams: PageProps<'/onboarding/follow'>['searchParams'];
}) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === 'string' ? next : null);
  const me = await requireOnboardedUser();
  const home = await myHomeArea(me.id);

  const [near, active] = await Promise.all([
    home ? discoverPeople('area', home.slug, 5) : Promise.resolve([] as DiscoverPerson[]),
    discoverPeople('suggested', null, 10),
  ]);
  const people = [...new Map([...near, ...active].map((p) => [p.id, p])).values()].slice(0, 5);
  if (people.length === 0) redirect(nextPath);

  const graph = await myGraph();
  const path = `/onboarding/follow?next=${encodeURIComponent(nextPath)}`;
  const t = copy.onboarding;

  return (
    <>
      <ul className="divide-line border-line bg-surface mt-6 divide-y rounded-[var(--radius-card)] border px-4">
        {people.map((p) => (
          <PersonRow key={p.id} person={p} meta={copy.discover.places(p.score)}>
            <RelationshipActions
              userId={p.id}
              rel={relationshipWith(me.id, p.id, graph.friendships, graph.follows)}
              path={path}
            />
          </PersonRow>
        ))}
      </ul>
      <Link
        href={nextPath}
        className={buttonClass({ size: 'lg', fullWidth: true, className: 'mt-6' })}
      >
        {t.followContinue}
      </Link>
    </>
  );
}

export default function FollowStepPage(props: PageProps<'/onboarding/follow'>) {
  return (
    <main className="mx-auto min-h-dvh max-w-[480px] px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-10">
      <p className="font-display text-primary text-xl font-semibold">{copy.app.name}</p>
      <h1 className="font-display mt-4 text-2xl font-semibold">{copy.onboarding.followTitle}</h1>
      <p className="text-muted mt-2">{copy.onboarding.followIntro}</p>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="bg-line/60 mt-6 h-64 animate-pulse rounded-[var(--radius-card)]"
          />
        }
      >
        <FollowStep searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
