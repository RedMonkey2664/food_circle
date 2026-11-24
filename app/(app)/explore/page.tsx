import Link from 'next/link';
import { Suspense } from 'react';
import { PageTitle, Sticker, type StickerName } from '@/components/brand/Sticker';
import { ExploreCard, TierPills } from '@/components/explore/ExploreCard';
import { CityPicker } from '@/components/place/CityPicker';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { explorePlaces } from '@/lib/data/explore';
import { recommendedPlaces, type RecommendedPlace } from '@/lib/data/recommend';
import { cityForNear } from '@/lib/domain/cities';
import {
  EXPLORE_CUISINES,
  EXPLORE_TYPES,
  exploreHref,
  hasFilters,
  parseExploreFilters,
  type ExploreFilters,
} from '@/lib/domain/explore';
import { cuisineLabel, PLACE_TYPE_LABEL } from '@/lib/domain/place';
import { readNear } from '@/lib/near';

export const metadata = { title: 'Explore' };

const t = copy.explore;

const TYPE_CHIP: Record<(typeof EXPLORE_TYPES)[number], string> = {
  restaurant: 'Restaurants',
  cafe: 'Cafes',
  street_stall: 'Street food',
  bakery: 'Bakeries',
  sweet_shop: 'Sweet shops',
  bar: 'Bars',
};

/** Dineout-style collection tiles: each one is just a preset filter. */
const COLLECTIONS: Array<{
  key: keyof typeof t.collection;
  href: string;
  sticker: StickerName;
  tone: string;
}> = [
  {
    key: 'cafe',
    href: exploreHref({ type: 'cafe' }),
    sticker: 'toast',
    tone: 'bg-[#f3e3c8]',
  },
  { key: 'street', href: exploreHref({ type: 'street_stall' }), sticker: 'fries', tone: 'bg-sun' },
  { key: 'veg', href: exploreHref({ veg: true }), sticker: 'sunflower', tone: 'bg-[#dcefd9]' },
  {
    key: 'udupi',
    href: exploreHref({ cuisine: 'udupi' }),
    sticker: 'pancakes',
    tone: 'bg-[#fbe3c4]',
  },
  {
    key: 'sweet',
    href: exploreHref({ type: 'bakery' }),
    sticker: 'cheesecake',
    tone: 'bg-[#f9dfe8]',
  },
  {
    key: 'late',
    href: exploreHref({ type: 'bar' }),
    sticker: 'vinyl',
    tone: 'bg-ink text-[#fbf3e6]',
  },
];

function Chip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={on ? 'true' : undefined}
      scroll={false}
      className={cn(
        'flex min-h-10 shrink-0 items-center rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors duration-(--dur-tap)',
        on
          ? 'border-ink bg-ink text-[#fbf3e6]'
          : 'border-line bg-surface text-ink hover:border-muted',
      )}
    >
      {children}
    </Link>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <nav
      aria-label={label}
      className="-mx-4 flex snap-x [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
    >
      {children}
    </nav>
  );
}

function Filters({ f }: { f: ExploreFilters }) {
  const base = { ...f, page: 1 };
  return (
    <div className="mt-5 space-y-2.5">
      <form action="/explore" className="flex gap-2" role="search">
        {f.type ? <input type="hidden" name="type" value={f.type} /> : null}
        {f.cuisine ? <input type="hidden" name="cuisine" value={f.cuisine} /> : null}
        {f.veg ? <input type="hidden" name="veg" value="1" /> : null}
        <label htmlFor="explore-q" className="sr-only">
          {t.searchLabel}
        </label>
        <input
          id="explore-q"
          name="q"
          type="search"
          defaultValue={f.q ?? ''}
          maxLength={60}
          placeholder={t.searchPlaceholder}
          className="border-line bg-surface placeholder:text-muted focus-visible:border-primary min-h-11 min-w-0 flex-1 rounded-[var(--radius-button)] border px-3.5 outline-none"
        />
        <button
          type="submit"
          className="bg-primary text-on-primary sk-press min-h-11 rounded-[var(--radius-button)] px-4 font-bold"
        >
          {t.search}
        </button>
      </form>
      <ChipRow label={t.types}>
        <Chip href={exploreHref({ ...base, type: undefined })} on={!f.type}>
          {t.all}
        </Chip>
        {EXPLORE_TYPES.map((ty) => (
          <Chip key={ty} href={exploreHref({ ...base, type: ty })} on={f.type === ty}>
            {TYPE_CHIP[ty]}
          </Chip>
        ))}
        <Chip href={exploreHref({ ...base, veg: !f.veg })} on={f.veg}>
          <span
            aria-hidden
            className="border-veg mr-1.5 flex size-3.5 items-center justify-center rounded-[3px] border-[1.5px]"
          >
            <span className="bg-veg size-1.5 rounded-full" />
          </span>
          {t.veg}
        </Chip>
      </ChipRow>
      <ChipRow label={t.cuisines}>
        {EXPLORE_CUISINES.map((c) => (
          <Chip
            key={c}
            href={exploreHref({ ...base, cuisine: f.cuisine === c ? undefined : c })}
            on={f.cuisine === c}
          >
            {cuisineLabel(c)}
          </Chip>
        ))}
      </ChipRow>
      {hasFilters(f) ? (
        <Link
          href="/explore"
          scroll={false}
          className="text-primary inline-block py-1 text-sm font-semibold underline underline-offset-4"
        >
          {t.clear}
        </Link>
      ) : null}
    </div>
  );
}

function Collections() {
  return (
    <section className="mt-7">
      <h2 className="font-display text-xl font-semibold">{t.collections}</h2>
      <ul className="-mx-4 mt-3 flex snap-x [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:px-0 lg:grid-cols-6">
        {COLLECTIONS.map((c) => {
          const copyFor = t.collection[c.key];
          return (
            <li key={c.key} className="w-[150px] shrink-0 snap-start md:w-auto">
              <Link
                href={c.href}
                scroll={false}
                data-reveal="pop"
                className={cn(
                  'group relative flex h-[168px] flex-col justify-end overflow-hidden rounded-[var(--radius-card)] p-3.5',
                  c.tone,
                )}
              >
                <span
                  aria-hidden
                  className="absolute -top-1 -right-2 block transition-[rotate,scale] duration-(--dur-enter) ease-(--ease-spring) group-hover:scale-110 group-hover:rotate-6"
                >
                  <Sticker name={c.sticker} size={86} tilt={8} />
                </span>
                <span className="font-display relative text-lg leading-tight font-semibold">
                  {copyFor.title}
                </span>
                <span className="relative mt-0.5 text-xs opacity-80">{copyFor.hint}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Loved({ places }: { places: RecommendedPlace[] }) {
  if (!places.length) return null;
  return (
    <section className="mt-7">
      <h2 className="font-display text-xl font-semibold">{t.loved}</h2>
      <p className="text-muted text-sm">{t.lovedHint}</p>
      <ul className="-mx-4 mt-3 flex snap-x [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        {places.slice(0, 12).map((p) => (
          <li key={p.id} className="w-[230px] shrink-0 snap-start">
            <Link
              href={`/place/${p.id}`}
              className="sk-card bg-surface border-primary/30 flex h-full flex-col rounded-[var(--radius-card)] border-2 p-3.5"
            >
              <span className="font-display text-lg leading-snug font-semibold">{p.name}</span>
              <span className="text-muted text-sm">
                {[p.areaName, PLACE_TYPE_LABEL[p.type]].filter(Boolean).join(' · ')}
              </span>
              <TierPills p={p} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function Results({ city, f }: { city: string; f: ExploreFilters }) {
  const near = await readNear();
  const [page, loved] = await Promise.all([
    explorePlaces(city, f),
    near ? recommendedPlaces(near) : Promise.resolve([] as RecommendedPlace[]),
  ]);
  const byId = new Map(loved.map((p) => [p.id, p]));
  return (
    <>
      {!hasFilters(f) && f.page === 1 ? <Loved places={loved} /> : null}
      <section className="mt-8" aria-labelledby="explore-results">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="explore-results" className="font-display text-xl font-semibold">
            {t.results(city)}
          </h2>
          {f.page > 1 ? <span className="text-muted text-sm">{t.page(f.page)}</span> : null}
        </div>
        {page.places.length === 0 ? (
          <div className="border-line mt-3 rounded-[var(--radius-card)] border border-dashed p-6 text-center">
            <p className="text-muted">{t.none}</p>
            <Link
              href="/add-place"
              className="text-primary mt-2 inline-block font-semibold underline underline-offset-4"
            >
              {t.addPlace}
            </Link>
          </div>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {page.places.map((p, i) => (
              <li key={p.id}>
                <ExploreCard place={p} verdicts={byId.get(p.id)} priority={i < 2} />
              </li>
            ))}
          </ul>
        )}
        {f.page > 1 || page.more ? (
          <nav aria-label={t.page(f.page)} className="mt-6 flex items-center justify-between gap-3">
            {f.page > 1 ? (
              <Link
                href={exploreHref({ ...f, page: f.page - 1 })}
                className="border-line bg-surface flex min-h-11 items-center rounded-[var(--radius-button)] border px-4 font-semibold"
              >
                ← {t.prev}
              </Link>
            ) : (
              <span />
            )}
            {page.more ? (
              <Link
                href={exploreHref({ ...f, page: f.page + 1 })}
                className="bg-ink flex min-h-11 items-center rounded-[var(--radius-button)] px-4 font-semibold text-[#fbf3e6]"
              >
                {t.next} →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </>
  );
}

async function ExploreBody({
  searchParams,
}: {
  searchParams: PageProps<'/explore'>['searchParams'];
}) {
  const [near, raw] = await Promise.all([readNear(), searchParams]);
  const f = parseExploreFilters(raw);
  const city = cityForNear(near).name;
  return (
    <>
      <p className="text-muted mt-2 max-w-[52ch]">{t.intro(city)}</p>
      <div className="mt-4">
        <CityPicker initial={near} />
      </div>
      <Filters f={f} />
      {!hasFilters(f) && f.page === 1 ? <Collections /> : null}
      <Results city={city} f={f} />
      <p className="text-muted mt-10 text-xs">{t.sources}</p>
    </>
  );
}

export default function ExplorePage(props: PageProps<'/explore'>) {
  return (
    <main className="pt-2">
      <PageTitle sticker="croissant" tilt={-8}>
        {t.title}
      </PageTitle>
      <Suspense
        fallback={
          <div aria-busy="true" className="mt-4 space-y-3">
            <div className="bg-line/60 h-12 animate-pulse rounded-[var(--radius-button)]" />
            <div className="bg-line/60 h-10 animate-pulse rounded-full" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-line/60 h-72 animate-pulse rounded-[var(--radius-card)]"
                />
              ))}
            </div>
          </div>
        }
      >
        <ExploreBody searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
