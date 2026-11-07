import Link from 'next/link';
import { Suspense } from 'react';
import { TrackView } from '@/components/pwa/TrackView';
import { ShareButton } from '@/components/share/ShareButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonClass } from '@/components/ui/Button';
import { requireOnboardedUser } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { myRecap } from '@/lib/data/recap';
import { formatDay } from '@/lib/domain/mapCard';
import { cuisineLabel } from '@/lib/domain/place';
import { PageTitle } from '@/components/brand/Sticker';

export const metadata = { title: 'Your year in food' };

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="bg-surface border-line rounded-[var(--radius-card)] border p-4 text-center">
      <p className="font-display text-3xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted text-xs">{label}</p>
    </div>
  );
}

async function Recap({ searchParams }: { searchParams: PageProps<'/recap'>['searchParams'] }) {
  await requireOnboardedUser();
  const sp = await searchParams;
  const thisYear = Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(
      new Date(),
    ),
  );
  const year =
    typeof sp.year === 'string' && /^\d{4}$/.test(sp.year)
      ? Math.min(Number(sp.year), thisYear)
      : thisYear;
  const r = await myRecap(year);
  const t = copy.recap;

  const yearNav = (
    <nav aria-label={t.years} className="flex items-center gap-3 text-sm">
      <Link
        href={`/recap?year=${year - 1}`}
        className="text-primary inline-flex min-h-11 items-center font-semibold"
      >
        ‹ {year - 1}
      </Link>
      <span className="font-display text-lg font-semibold">{year}</span>
      {year < thisYear ? (
        <Link
          href={`/recap?year=${year + 1}`}
          className="text-primary inline-flex min-h-11 items-center font-semibold"
        >
          {year + 1} ›
        </Link>
      ) : null}
    </nav>
  );

  if (!r || r.visits === 0) {
    return (
      <>
        {yearNav}
        <div className="mt-4">
          <EmptyState
            title={t.empty(year)}
            body={t.emptyBody}
            action={
              <Link href="/log" className={buttonClass()}>
                {copy.home.logFirst}
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const verdicts = r.go + r.skip + r.onlyFor || 1;
  const maxMonth = Math.max(1, ...r.byMonth);

  return (
    <>
      <TrackView name="recap_viewed" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {yearNav}
        <ShareButton
          target={{ kind: 'recap', ref: String(year) }}
          label={t.share}
          text={t.shareText(year, r.places)}
        />
      </div>

      <section className="bg-primary text-on-primary mt-3 rounded-[var(--radius-card)] p-6">
        <p className="text-sm font-semibold opacity-90">{t.youAte}</p>
        <p className="font-display mt-1 text-5xl font-semibold tabular-nums">{r.places}</p>
        <p className="mt-1 text-lg">{t.placesAcross(r.areas)}</p>
        {r.busiestMonth ? (
          <p className="mt-3 text-sm opacity-90">{t.busiest(r.busiestMonth)}</p>
        ) : null}
      </section>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat value={r.visits} label={t.meals} />
        <Stat value={r.newPlaces} label={t.newPlaces} />
        <Stat value={r.badges.length} label={t.badges} />
      </div>

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold">{t.verdicts}</h2>
        <div className="mt-2 flex h-4 overflow-hidden rounded-full" aria-hidden>
          <span className="bg-go" style={{ width: `${(r.go / verdicts) * 100}%` }} />
          <span className="bg-onlyfor" style={{ width: `${(r.onlyFor / verdicts) * 100}%` }} />
          <span className="bg-skip" style={{ width: `${(r.skip / verdicts) * 100}%` }} />
        </div>
        <p className="text-muted mt-2 text-sm">{t.verdictLine(r.go, r.onlyFor, r.skip)}</p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold">{t.monthByMonth}</h2>
        <div className="mt-3 flex h-28 items-end gap-1.5" role="img" aria-label={t.monthByMonth}>
          {r.byMonth.map((c, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn('w-full rounded-t-md', c ? 'bg-primary/80' : 'bg-line')}
                style={{ height: `${Math.max(4, (c / maxMonth) * 100)}%` }}
                title={`${c}`}
              />
              <span className="text-muted text-[10px]">{MONTHS[i]}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {r.topAreas.length ? (
          <section className="border-line bg-surface rounded-[var(--radius-card)] border p-4">
            <h2 className="font-semibold">{t.topAreas}</h2>
            <ol className="mt-2 space-y-1 text-sm">
              {r.topAreas.map((a, i) => (
                <li key={a.name}>
                  {i + 1}. {a.name} <span className="text-muted">({t.places(a.places)})</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        {r.topCuisines.length ? (
          <section className="border-line bg-surface rounded-[var(--radius-card)] border p-4">
            <h2 className="font-semibold">{t.topCuisines}</h2>
            <ol className="mt-2 space-y-1 text-sm">
              {r.topCuisines.map((c, i) => (
                <li key={c.name}>
                  {i + 1}. {cuisineLabel(c.name)}{' '}
                  <span className="text-muted">({t.places(c.places)})</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {r.first ? (
          <section className="border-line bg-surface rounded-[var(--radius-card)] border p-4">
            <h2 className="text-muted text-xs font-bold tracking-wide uppercase">{t.firstBite}</h2>
            <p className="font-display mt-1 text-lg font-semibold">{r.first.name}</p>
            <p className="text-muted text-sm">{formatDay(r.first.date)}</p>
          </section>
        ) : null}
        {r.favourite ? (
          <section className="border-line bg-surface rounded-[var(--radius-card)] border p-4">
            <h2 className="text-muted text-xs font-bold tracking-wide uppercase">{t.favourite}</h2>
            <p className="font-display mt-1 text-lg font-semibold">{r.favourite.name}</p>
            <p className="text-muted text-sm">{t.visitsCount(r.favourite.visits)}</p>
          </section>
        ) : null}
      </div>

      {r.badges.length ? (
        <section className="mt-6">
          <h2 className="font-display text-lg font-semibold">{t.badgesEarned}</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {r.badges.map((b) => (
              <li
                key={b.name}
                className="bg-primary-soft rounded-full px-3 py-1 text-sm font-semibold"
              >
                <span aria-hidden>{b.icon}</span> {b.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="text-muted mt-6 text-xs">{t.privateNote}</p>
    </>
  );
}

export default function RecapPage(props: PageProps<'/recap'>) {
  return (
    <main className="mx-auto w-full pt-2 lg:max-w-3xl">
      <PageTitle sticker="vinyl" tilt={0}>
        {copy.recap.title}
      </PageTitle>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="bg-line/60 mt-4 h-96 animate-pulse rounded-[var(--radius-card)]"
          />
        }
      >
        <Recap searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
