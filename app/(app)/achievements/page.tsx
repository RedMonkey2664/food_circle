import { Suspense } from 'react';
import { AchievementGrid } from '@/components/compete/AchievementGrid';
import { ProgressCard } from '@/components/compete/ProgressCard';
import { ShowcasePicker } from '@/components/compete/ShowcasePicker';
import { requireOnboardedUser } from '@/lib/auth';
import { copy } from '@/lib/copy';
import { achievements, myProgress } from '@/lib/data/achievements';
import { PageTitle } from '@/components/brand/Sticker';

export const metadata = { title: 'Achievements' };

async function Content() {
  const me = await requireOnboardedUser();
  const [items, progress] = await Promise.all([achievements(me.id), myProgress()]);
  const earned = items.filter((a) => a.earnedAt !== null);
  const locked = items.filter((a) => a.earnedAt === null);
  const pinned = earned
    .filter((a) => a.showcased !== null)
    .sort((a, b) => (a.showcased ?? 0) - (b.showcased ?? 0))
    .map((a) => a.slug);
  const t = copy.achieve;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <ProgressCard progress={progress} link={false} />
        <ShowcasePicker
          earned={earned.map((a) => ({ slug: a.slug, name: a.name, icon: a.icon }))}
          initial={pinned}
        />
      </div>
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">
          {t.earned} <span className="text-muted text-sm font-normal">({earned.length})</span>
        </h2>
        <div className="mt-3">
          {earned.length ? (
            <AchievementGrid items={earned} shareable />
          ) : (
            <p className="text-muted text-sm">{t.none}</p>
          )}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">
          {t.locked} <span className="text-muted text-sm font-normal">({locked.length})</span>
        </h2>
        <div className="mt-3">
          <AchievementGrid items={locked} />
        </div>
      </section>
    </>
  );
}

export default function AchievementsPage() {
  return (
    <main className="pt-2">
      <PageTitle sticker="torn-stars" tilt={-8}>
        {copy.achieve.title}
      </PageTitle>
      <p className="text-muted mt-1 mb-4 text-sm">{copy.achieve.intro}</p>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="bg-line/60 h-80 animate-pulse rounded-[var(--radius-card)]"
          />
        }
      >
        <Content />
      </Suspense>
    </main>
  );
}
