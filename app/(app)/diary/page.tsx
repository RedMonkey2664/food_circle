import Link from 'next/link';
import { Suspense } from 'react';
import { DiaryMap } from '@/components/map/DiaryMap';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { VerdictCard } from '@/components/verdict/VerdictCard';
import { VerdictLabel } from '@/components/verdict/VerdictLabel';
import { requireOnboardedUser } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { myLogbook, myMapPins, myTimeline, onThisDay } from '@/lib/data/diary';
import { myProgress } from '@/lib/data/achievements';
import { ProgressCard } from '@/components/compete/ProgressCard';
import { cuisineLabel } from '@/lib/domain/place';
import { PageTitle } from '@/components/brand/Sticker';
import { NavPill } from '@/components/motion/NavPill';
import { readNear } from '@/lib/near';

export const metadata = { title: 'Diary' };

type View = 'timeline' | 'map' | 'logbook';
const VIEWS: View[] = ['timeline', 'map', 'logbook'];

function Tabs({ active }: { active: View }) {
  return (
    <nav
      aria-label={copy.diary.title}
      className="border-line relative mt-2 grid grid-cols-3 border-b md:max-w-md"
    >
      <NavPill fit="underline" className="bg-primary rounded-full" />
      {VIEWS.map((v) => (
        <Link
          key={v}
          href={v === 'timeline' ? '/diary' : `/diary?view=${v}`}
          aria-current={active === v ? 'page' : undefined}
          className={cn(
            'flex min-h-11 items-center justify-center border-b-2 font-medium',
            active === v ? 'text-primary border-transparent' : 'text-muted border-transparent',
          )}
        >
          {copy.diary.tabs[v]}
        </Link>
      ))}
    </nav>
  );
}

async function OnThisDay() {
  const items = await onThisDay();
  if (items.length === 0) return null;
  return (
    <section className="border-primary/30 bg-primary-soft mt-4 rounded-[var(--radius-card)] border p-4">
      <h2 className="font-display font-semibold">{copy.diary.onThisDay}</h2>
      <ul className="mt-2 space-y-1">
        {items.map((i) => (
          <li key={i.visitId} className="text-sm">
            <Link href={`/place/${i.placeId}`} className="font-semibold hover:underline">
              {i.placeName}
            </Link>{' '}
            · <VerdictLabel verdict={i.verdict} /> · {copy.diary.yearsAgo(i.yearsAgo)}
          </li>
        ))}
      </ul>
    </section>
  );
}

async function DiaryContent({
  searchParams,
}: {
  searchParams: PageProps<'/diary'>['searchParams'];
}) {
  const sp = await searchParams;
  const view: View = sp.view === 'map' || sp.view === 'logbook' ? sp.view : 'timeline';
  const me = await requireOnboardedUser();
  const t = copy.diary;

  if (view === 'map') {
    return (
      <>
        <Tabs active={view} />
        <div className="mt-4">
          <DiaryMap pins={await myMapPins()} near={await readNear()} />
        </div>
      </>
    );
  }

  if (view === 'logbook') {
    const lb = await myLogbook();
    return (
      <>
        <Tabs active={view} />
        <div className="mt-4 grid grid-cols-2 gap-3 md:max-w-md">
          {[
            [t.logbookTotal, lb.total],
            [t.logbookAreas, lb.areasCovered],
          ].map(([label, n]) => (
            <div
              key={label}
              className="border-line bg-surface rounded-[var(--radius-card)] border p-4 text-center"
            >
              <p className="font-display text-3xl font-semibold">{n}</p>
              <p className="text-muted text-sm">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {(
            [
              [t.byArea, lb.byArea.map((a) => ({ ...a, label: a.label }))],
              [t.byCuisine, lb.byCuisine.map((c) => ({ ...c, label: cuisineLabel(c.label) }))],
            ] as const
          ).map(([title, rows]) =>
            rows.length ? (
              <section key={title}>
                <h2 className="font-display text-lg font-semibold">{title}</h2>
                <ul className="mt-2 space-y-1.5">
                  {rows.map((r) => (
                    <li key={r.label} className="flex items-center gap-3 text-sm">
                      <span className="w-32 shrink-0 truncate">{r.label}</span>
                      <span
                        aria-hidden
                        className="bg-primary/70 h-2 rounded-full"
                        style={{
                          width: `${Math.max(6, (r.places / Math.max(...rows.map((x) => x.places))) * 100)}%`,
                        }}
                      />
                      <span className="text-muted ml-auto tabular-nums">{r.places}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      </>
    );
  }

  const cursor = typeof sp.cursor === 'string' ? sp.cursor : undefined;
  const page = await myTimeline(me.id, cursor);
  const progress = !cursor ? await myProgress() : null;
  return (
    <>
      <Tabs active={view} />
      {progress ? (
        <div className="mt-4 md:max-w-2xl">
          <ProgressCard progress={progress} />
          <Link
            href="/recap"
            className="text-primary mt-2 inline-flex min-h-11 items-center text-sm font-semibold"
          >
            🗓️ {copy.recap.open} ›
          </Link>
          <Link
            href="/import"
            className="text-primary mt-2 ml-4 inline-flex min-h-11 items-center text-sm font-semibold"
          >
            ⬇ {copy.takeout.entry} ›
          </Link>
        </div>
      ) : null}
      {!cursor ? <OnThisDay /> : null}
      {page.items.length === 0 && !cursor ? (
        <div className="mt-6">
          <EmptyState
            title={t.empty}
            action={
              <Link href="/log" className={buttonClass()}>
                {copy.home.logFirst}
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-2 md:max-w-2xl">
          {page.items.map((item) => (
            <li key={item.visitId}>
              <VerdictCard data={item} />
            </li>
          ))}
        </ul>
      )}
      {page.nextCursor ? (
        <Link
          href={`/diary?cursor=${encodeURIComponent(page.nextCursor)}`}
          className={buttonClass({
            variant: 'ghost',
            fullWidth: true,
            className: 'mt-4 md:max-w-2xl',
          })}
        >
          {copy.home.older}
        </Link>
      ) : null}
    </>
  );
}

export default function DiaryPage(props: PageProps<'/diary'>) {
  return (
    <main className="pt-2">
      <PageTitle sticker="camera-hand" tilt={8}>
        {copy.diary.title}
      </PageTitle>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="bg-line/60 mt-4 h-64 animate-pulse rounded-[var(--radius-card)]"
          />
        }
      >
        <DiaryContent searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
