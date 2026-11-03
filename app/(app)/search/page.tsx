import Link from 'next/link';
import { Suspense } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { PlaceSearch } from '@/components/place/PlaceSearch';
import { copy } from '@/lib/copy';
import { searchPlaces } from '@/lib/data/places';

export const metadata = { title: 'Search' };

async function Results({ searchParams }: { searchParams: PageProps<'/search'>['searchParams'] }) {
  const { q } = await searchParams;
  const query = typeof q === 'string' ? q : '';
  const results = query.trim().length >= 2 ? await searchPlaces(query) : null;
  return (
    <>
      <PlaceSearch mode="place" action="/search" initialQuery={query} initialResults={results} />
      <section className="border-line mt-8 rounded-[var(--radius-card)] border border-dashed p-4">
        <h2 className="font-semibold">{copy.search.cantFind}</h2>
        <p className="text-muted mt-1 text-sm">{copy.search.cantFindBody}</p>
        <Link
          href={query.trim() ? `/add-place?name=${encodeURIComponent(query.trim())}` : '/add-place'}
          className={buttonClass({ variant: 'secondary', className: 'mt-3' })}
        >
          {copy.search.addIt}
        </Link>
      </section>
    </>
  );
}

export default function SearchPage(props: PageProps<'/search'>) {
  return (
    <main className="mx-auto w-full pt-2 lg:max-w-2xl">
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
