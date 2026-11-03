import Link from 'next/link';
import { copy } from '@/lib/copy';
import type { Progress } from '@/lib/data/achievements';

/**
 * Your food journey: level, places, badges, weekly streak. Personal only, never compared
 * with anyone. Gentle copy: a quiet week is a "grace week", never "you lost your streak".
 */
export function ProgressCard({ progress, link = true }: { progress: Progress; link?: boolean }) {
  const t = copy.achieve;
  return (
    <section className="border-line bg-surface rounded-[var(--radius-card)] border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-primary text-lg font-semibold">{t.level(progress.level)}</p>
        {link ? (
          <Link href="/achievements" className="text-primary text-sm font-semibold">
            {t.seeAll} ›
          </Link>
        ) : null}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {(
          [
            [t.allTime, String(progress.allTime)],
            [t.thisMonth, String(progress.thisMonth)],
            ['Badges', `${progress.badgesEarned}/${progress.badgesTotal}`],
          ] as const
        ).map(([label, n]) => (
          <div key={label} className="bg-bg rounded-[var(--radius-button)] py-2">
            <dd className="font-display text-xl font-semibold tabular-nums">{n}</dd>
            <dt className="text-muted text-xs">{label}</dt>
          </div>
        ))}
      </dl>
      {progress.currentStreak > 0 ? (
        <p className="mt-3 text-sm">
          <span aria-hidden>🔥 </span>
          <span className="font-semibold">{t.streak(progress.currentStreak)}</span>
          <span className="text-muted"> · {t.bestStreak(progress.bestStreak)}</span>
          {progress.inGrace ? <span className="text-muted block text-xs">{t.grace}</span> : null}
        </p>
      ) : null}
    </section>
  );
}
