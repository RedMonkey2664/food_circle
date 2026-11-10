import Link from 'next/link';
import { RansomNumber } from '@/components/motion/RansomNumber';
import { copy } from '@/lib/copy';
import type { Progress } from '@/lib/data/achievements';

/**
 * Your food journey: level, places, badges, weekly streak. Personal only, never compared
 * with anyone. Gentle copy: a quiet week is a "grace week", never "you lost your streak".
 */
export function ProgressCard({ progress, link = true }: { progress: Progress; link?: boolean }) {
  const t = copy.achieve;
  return (
    <section
      data-reveal="flip"
      className="sk-ink-card relative overflow-hidden rounded-[var(--radius-card)] p-4 text-[#fbf3e6]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-sun text-xl font-semibold">{t.level(progress.level)}</p>
        {link ? (
          <Link
            href="/achievements"
            className="text-sm font-semibold text-[#fbf3e6] underline-offset-4 hover:underline"
          >
            {t.seeAll} ›
          </Link>
        ) : null}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {(
          [
            [t.allTime, progress.allTime, null],
            [t.thisMonth, progress.thisMonth, null],
            ['Badges', progress.badgesEarned, progress.badgesTotal],
          ] as const
        ).map(([label, n, of]) => (
          <div key={label} className="rounded-[var(--radius-button)] bg-white/[0.07] py-2.5">
            <dd className="font-display text-2xl font-semibold">
              <RansomNumber value={n} />
              {of !== null ? <span className="text-base text-white/60">/{of}</span> : null}
            </dd>
            <dt className="text-xs text-white/70">{label}</dt>
          </div>
        ))}
      </dl>
      {progress.currentStreak > 0 ? (
        <p className="mt-3 text-sm">
          <span aria-hidden>🔥 </span>
          <span className="font-semibold">{t.streak(progress.currentStreak)}</span>
          <span className="text-white/70"> · {t.bestStreak(progress.bestStreak)}</span>
          {progress.inGrace ? <span className="block text-xs text-white/70">{t.grace}</span> : null}
        </p>
      ) : null}
    </section>
  );
}
