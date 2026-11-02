import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PlaceSearchBox } from '@/components/place/PlaceSearchBox';
import { PlaceSearchResults } from '@/components/place/PlaceSearchResults';
import { RecentPlaces } from '@/components/place/RecentPlaces';
import { LogSheet } from '@/components/verdict/LogSheet';
import { requireOnboardedUser } from '@/lib/auth';
import { copy } from '@/lib/copy';
import { getPlace, searchPlaces } from '@/lib/data/places';
import { profileStats } from '@/lib/data/profile';

export const metadata = { title: 'Log a place' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function LogContent({ searchParams }: { searchParams: PageProps<'/log'>['searchParams'] }) {
  const { place: placeParam, q } = await searchParams;
  const me = await requireOnboardedUser();

  // Step 0: pick the place.
  if (typeof placeParam !== 'string') {
    const query = typeof q === 'string' ? q : '';
    const results = query.trim().length >= 2 ? await searchPlaces(query) : null;
    return (
      <>
        <PlaceSearchBox query={query} action="/log" />
        {results === null ? (
          <RecentPlaces title={copy.search.recent} />
        ) : (
          <PlaceSearchResults results={results} hrefFor={(id) => `/log?place=${id}`} />
        )}
      </>
    );
  }

  if (!UUID_RE.test(placeParam)) notFound();
  const place = await getPlace(placeParam);
  if (!place) notFound();
  const stats = await profileStats(me.id);

  return (
    <LogSheet
      place={{ id: place.id, name: place.name, areaName: place.areaName }}
      defaultVisibility={me.defaultVisibility}
      isPrivateAccount={me.isPrivate}
      counts={{ friends: stats.friends, followers: stats.followers }}
    />
  );
}

export default function LogPage(props: PageProps<'/log'>) {
  return (
    <main className="pt-2">
      <h1 className="font-display mb-3 text-2xl font-semibold">{copy.log.title}</h1>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="bg-line/60 h-64 animate-pulse rounded-[var(--radius-card)]"
          />
        }
      >
        <LogContent searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
