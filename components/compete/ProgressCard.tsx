import { copy } from '@/lib/copy';
import type { Progress } from '@/lib/data/competition';

/**
 * Your level, counts and weekly streak (P6-01, P6-05, P6-06). Gentle copy: a quiet week is a
 * "grace week", never "you lost your streak" (SCORING_BADGES.md section 5).
 */
export function ProgressCard({ progress }: { progress: Progress }) {
  const t = copy.compete;
  return (
    <section className="border-line bg-surface rounded-[var(--radius-card)] border p-4">
      <p className="font-display text-primary text-lg font-semibold">{t.level(progress.level)}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {(
          [
            [t.thisWeek, progress.thisWeek],
            [t.thisMonth, progress.thisMonth],
            [t.allTime, progress.allTime],
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
      ) : progress.bestStreak > 0 ? (
        <p className="text-muted mt-3 text-sm">{t.bestStreak(progress.bestStreak)}</p>
      ) : null}
    </section>
  );
}
