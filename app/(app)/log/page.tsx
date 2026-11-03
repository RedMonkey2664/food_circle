import type { Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CircleCloseLink } from '@/components/motion/CircleLink';
import { PlaceSearch } from '@/components/place/PlaceSearch';
import { CloseIcon } from '@/components/ui/icons';
import { LogSheet } from '@/components/verdict/LogSheet';
import { requireOnboardedUser } from '@/lib/auth';
import { copy } from '@/lib/copy';
import { myGroups } from '@/lib/data/groups';
import { getPlace, searchPlaces } from '@/lib/data/places';
import { profileStats } from '@/lib/data/profile';

export const metadata = { title: 'Log a place' };
// The log screen is a spice-orange takeover; tint the browser/status bar to match.
export const viewport: Viewport = { themeColor: '#c2410c' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-display text-bg mt-6 mb-6 text-[2.6rem] leading-[1.04] font-semibold tracking-tight text-balance">
      {children}
    </h1>
  );
}

async function LogContent({ searchParams }: { searchParams: PageProps<'/log'>['searchParams'] }) {
  const { place: placeParam, q } = await searchParams;
  const me = await requireOnboardedUser();

  // Step 0: pick the place.
  if (typeof placeParam !== 'string') {
    const query = typeof q === 'string' ? q : '';
    const results = query.trim().length >= 2 ? await searchPlaces(query) : null;
    return (
      <>
        <Heading>{copy.log.pickTitle}</Heading>
        <section className="bg-surface rounded-[var(--radius-card)] p-4 shadow-[0_18px_40px_-24px_rgb(60_20_5/0.55)]">
          <div className="-mt-3">
            <PlaceSearch mode="log" action="/log" initialQuery={query} initialResults={results} />
          </div>
        </section>
      </>
    );
  }

  if (!UUID_RE.test(placeParam)) notFound();
  const place = await getPlace(placeParam);
  if (!place) notFound();
  const [stats, groups] = await Promise.all([profileStats(me.id), myGroups()]);

  return (
    <>
      <Heading>{copy.log.prompt}</Heading>
      <div className="shadow-[0_18px_40px_-24px_rgb(60_20_5/0.55)]">
        <LogSheet
          place={{ id: place.id, name: place.name, areaName: place.areaName }}
          defaultVisibility={me.defaultVisibility}
          isPrivateAccount={me.isPrivate}
          counts={{ friends: stats.friends, followers: stats.followers }}
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        />
      </div>
    </>
  );
}

/**
 * Log takeover (UI_UX.md §4.5), opened with a circular reveal from the + button or
 * "I ate here" (lib/motion/circle-transition.ts). Close shrinks it back into that point.
 */
export default function LogPage(props: PageProps<'/log'>) {
  return (
    <main data-takeover className="relative mx-auto w-full md:max-w-lg md:pt-6">
      {/* Full-bleed brand colour behind the centred column. */}
      <div aria-hidden className="bg-primary fixed inset-0 -z-10" />
      <header className="flex items-center justify-between pt-1">
        <p className="text-bg/85 text-sm font-semibold tracking-wide">{copy.log.title}</p>
        <CircleCloseLink
          aria-label={copy.log.close}
          className="bg-ink text-bg flex size-11 items-center justify-center rounded-full transition-transform duration-150 active:scale-[0.92]"
        >
          <CloseIcon size={20} strokeWidth={2.4} />
        </CircleCloseLink>
      </header>
      <Suspense
        fallback={
          <div aria-busy="true">
            <div className="bg-bg/25 mt-7 mb-6 h-20 w-4/5 animate-pulse rounded-lg" />
            <div className="bg-surface/70 h-64 animate-pulse rounded-[var(--radius-card)]" />
          </div>
        }
      >
        <LogContent searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
