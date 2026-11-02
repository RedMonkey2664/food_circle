import { Suspense } from 'react';
import { PlaceSearchBox } from '@/components/place/PlaceSearchBox';
import { PlaceSearchResults } from '@/components/place/PlaceSearchResults';
import { RecentPlaces } from '@/components/place/RecentPlaces';
import { copy } from '@/lib/copy';
import { searchPlaces } from '@/lib/data/places';

export const metadata = { title: 'Search' };

async function Results({ searchParams }: { searchParams: PageProps<'/search'>['searchParams'] }) {
  const { q } = await searchParams;
  const query = typeof q === 'string' ? q : '';
  const results = query.trim().length >= 2 ? await searchPlaces(query) : null;
  return (
    <>
      <PlaceSearchBox query={query} action="/search" />
      {results === null ? (
        <>
          <p className="text-muted mt-3 text-sm">{copy.search.hint}</p>
          <RecentPlaces title={copy.search.recent} />
        </>
      ) : (
        <PlaceSearchResults results={results} hrefFor={(id) => `/place/${id}`} />
      )}
      <section className="border-line mt-8 rounded-[var(--radius-card)] border border-dashed p-4">
        <h2 className="font-semibold">{copy.search.cantFind}</h2>
        <p className="text-muted mt-1 text-sm">{copy.search.cantFindBody}</p>
      </section>
    </>
  );
}

export default function SearchPage(props: PageProps<'/search'>) {
  return (
    <main className="pt-2">
      <h1 className="font-display text-2xl font-semibold">{copy.search.title}</h1>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="bg-line/60 mt-3 h-12 animate-pulse rounded-[var(--radius-button)]"
          />
        }
      >
        <Results searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
