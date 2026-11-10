import { Scribble } from '@/components/brand/Scribble';
import { FlipBadge } from '@/components/interactive/FlipBadge';
import { ShareButton } from '@/components/share/ShareButton';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import type { Achievement } from '@/lib/data/achievements';
import { formatDay } from '@/lib/domain/mapCard';

/** Achievement cards: unlocked in full colour, locked greyed with progress, secrets masked. */
export function AchievementGrid({
  items,
  shareable = false,
}: {
  items: Achievement[];
  /** Your own page: offer a share card for each unlocked badge. */
  shareable?: boolean;
}) {
  const t = copy.achieve;
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((a) => {
        const earned = a.earnedAt !== null;
        const pct =
          a.progress !== null ? Math.round((a.progress / Math.max(a.threshold, 1)) * 100) : 0;
        return (
          <li key={a.slug} data-reveal="pop">
            <FlipBadge
              label={`${a.name}. ${copy.interactive.flipHint}`}
              className="h-full"
              back={
                <div className="sk-ink-card flex h-full items-center gap-4 rounded-[var(--radius-card)] p-3 text-[#fbf3e6]">
                  <span
                    aria-hidden
                    className="flex size-14 shrink-0 items-center justify-center rounded-full text-3xl"
                    style={{
                      background: earned
                        ? '#f6b500'
                        : `conic-gradient(#f6b500 ${pct}%, rgb(255 255 255 / 0.12) 0)`,
                    }}
                  >
                    <span className="flex size-11 items-center justify-center rounded-full bg-[#161412]">
                      {a.icon}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="font-display block text-lg leading-tight font-semibold">
                      {a.name}
                    </span>
                    <span className="mt-1 block text-sm text-white/75">
                      {earned && a.earnedAt
                        ? copy.interactive.unlockedOn(formatDay(a.earnedAt))
                        : a.progress !== null
                          ? `${t.progress(a.progress, a.threshold)} · ${copy.interactive.toGo(
                              Math.max(a.threshold - a.progress, 0),
                            )}`
                          : copy.interactive.secret}
                    </span>
                  </span>
                </div>
              }
              front={
                <div
                  className={cn(
                    'flex h-full items-start gap-3 rounded-[var(--radius-card)] border p-3',
                    earned ? 'sk-card border-primary/30 bg-surface' : 'border-line bg-surface/50',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'relative flex size-12 shrink-0 items-center justify-center rounded-full text-2xl',
                      earned ? 'bg-primary-soft' : 'bg-line/60 grayscale',
                    )}
                  >
                    {a.icon}
                    {earned ? (
                      <Scribble
                        shape="circle"
                        width={2.5}
                        delayMs={200}
                        className="-top-1 -left-1 size-[calc(100%+0.5rem)]"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block font-semibold', !earned && 'text-ink/70')}>
                      {a.name}
                      {a.showcased ? (
                        <span className="bg-primary text-on-primary ml-1.5 rounded-full px-1.5 py-0.5 align-middle text-[10px] font-bold">
                          {t.pinned}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted block text-sm">{a.description}</span>
                    {earned && a.earnedAt ? (
                      <span className="mt-1 flex flex-wrap items-center gap-x-3">
                        <span className="text-go text-xs font-medium">
                          {t.earnedOn(formatDay(a.earnedAt))}
                        </span>
                        {shareable ? (
                          <ShareButton
                            target={{ kind: 'badge', ref: a.slug }}
                            text={copy.share.badgeText(a.name)}
                            compact
                          />
                        ) : null}
                      </span>
                    ) : a.progress !== null ? (
                      <span className="mt-1.5 flex items-center gap-2">
                        <span
                          className="bg-line h-1.5 flex-1 overflow-hidden rounded-full"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={a.threshold}
                          aria-valuenow={a.progress}
                          aria-label={a.name}
                        >
                          <span
                            className="bg-primary block h-full rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="text-muted text-xs tabular-nums">
                          {t.progress(a.progress, a.threshold)}
                        </span>
                      </span>
                    ) : null}
                  </span>
                </div>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
