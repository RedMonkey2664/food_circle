import Link from 'next/link';
import { Suspense } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { PlaceSearch } from '@/components/place/PlaceSearch';
import { copy } from '@/lib/copy';
import { searchPlaces } from '@/lib/data/places';
import { readNear } from '@/lib/near';
import { CityPicker } from '@/components/place/CityPicker';
import { PageTitle } from '@/components/brand/Sticker';

export const metadata = { title: 'Search' };

async function Results({ searchParams }: { searchParams: PageProps<'/search'>['searchParams'] }) {
  const { q } = await searchParams;
  const query = typeof q === 'string' ? q : '';
  const near = await readNear();
  const results = query.trim().length >= 2 ? await searchPlaces(query, 20, near) : null;
  return (
    <>
      <CityPicker initial={near} className="mb-3" />
      {/* Keyed by city so a new pick shows the re-ranked results. */}
      <PlaceSearch
        key={near ? `${near.slug}:${near.lat}` : 'none'}
        mode="place"
        action="/search"
        initialQuery={query}
        initialResults={results}
      />
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
      <PageTitle sticker="lantern" tilt={4}>
        {copy.search.title}
      </PageTitle>
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
