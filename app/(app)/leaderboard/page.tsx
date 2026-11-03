import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Avatar } from '@/components/social/Avatar';
import { ProgressCard } from '@/components/compete/ProgressCard';
import { requireOnboardedUser } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { FLAGS } from '@/lib/config';
import { copy } from '@/lib/copy';
import { groupsWithBoards, leaderboard, myProgress, type Period } from '@/lib/data/competition';

export const metadata = { title: 'Leaderboard' };

const PERIODS: Period[] = ['week', 'month', 'all'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Pill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex min-h-10 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150',
        active ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface text-ink',
      )}
    >
      {children}
    </Link>
  );
}

async function Board({
  searchParams,
}: {
  searchParams: PageProps<'/leaderboard'>['searchParams'];
}) {
  if (!FLAGS.leaderboards) notFound();
  const sp = await searchParams;
  await requireOnboardedUser();
  const period: Period = PERIODS.includes(sp.period as Period) ? (sp.period as Period) : 'month';
  const groups = await groupsWithBoards();
  const groupId =
    typeof sp.group === 'string' && UUID_RE.test(sp.group) && groups.some((g) => g.id === sp.group)
      ? sp.group
      : null;
  const scope = groupId ? 'group' : sp.scope === 'following' ? 'following' : 'friends';
  const [rows, progress] = await Promise.all([
    leaderboard(scope, period, groupId ?? undefined),
    myProgress(),
  ]);
  const t = copy.compete;
  const href = (o: { scope?: string; group?: string; period?: Period }) => {
    const q = new URLSearchParams();
    const s = o.scope ?? (groupId ? undefined : scope);
    const g = o.group ?? (o.scope ? undefined : (groupId ?? undefined));
    if (g) q.set('group', g);
    else if (s && s !== 'friends') q.set('scope', s);
    const p = o.period ?? period;
    if (p !== 'month') q.set('period', p);
    const qs = q.toString();
    return qs ? `/leaderboard?${qs}` : '/leaderboard';
  };
  const me = rows.find((r) => r.isMe);
  const nextUp = me
    ? [...rows].reverse().find((r) => !r.isMe && r.score >= me.score && r.rank < me.rank)
    : undefined;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10">
      <div>
        <nav
          aria-label="Who"
          className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
        >
          <Pill href={href({ scope: 'friends' })} active={scope === 'friends'}>
            {t.scopes.friends}
          </Pill>
          <Pill href={href({ scope: 'following' })} active={scope === 'following'}>
            {t.scopes.following}
          </Pill>
          {groups.map((g) => (
            <Pill key={g.id} href={href({ group: g.id })} active={groupId === g.id}>
              {g.name}
            </Pill>
          ))}
        </nav>
        <nav aria-label="When" className="border-line mt-3 grid grid-cols-3 border-b md:max-w-md">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={href({ period: p })}
              aria-current={period === p ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center justify-center border-b-2 text-sm font-medium',
                period === p ? 'border-primary text-primary' : 'text-muted border-transparent',
              )}
            >
              {t.periods[p]}
            </Link>
          ))}
        </nav>

        {me ? (
          <p className="text-primary mt-3 text-sm font-semibold" aria-live="polite">
            {me.rank === 1
              ? t.top
              : nextUp && me.aheadBy
                ? t.beat(nextUp.displayName, me.aheadBy)
                : null}
          </p>
        ) : null}

        {rows.every((r) => r.score === 0) ? (
          <p className="text-muted mt-4 text-sm">{t.empty}</p>
        ) : null}
        <ol className="divide-line border-line bg-surface mt-3 divide-y rounded-[var(--radius-card)] border">
          {rows.map((r) => (
            <li
              key={r.userId}
              className={cn(
                'flex min-h-14 items-center gap-3 px-3 py-2',
                r.isMe && 'bg-primary-soft/60',
              )}
            >
              <span className="font-display w-7 text-center text-lg font-semibold tabular-nums">
                {r.rank}
              </span>
              <Avatar name={r.displayName} url={r.avatarUrl} size={36} />
              <Link href={`/u/${r.username}`} className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {r.displayName}
                  {r.isMe ? <span className="text-muted font-normal"> ({t.you})</span> : null}
                </span>
                {r.verified > 0 ? (
                  <span className="text-go text-xs font-medium">✓ {r.verified} verified</span>
                ) : null}
              </Link>
              <span className="text-right">
                <span className="font-display block text-lg font-semibold tabular-nums">
                  {r.score}
                </span>
                <span className="text-muted text-xs">{r.score === 1 ? 'place' : 'places'}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="text-muted mt-3 text-xs">{t.verifiedHint}</p>
        <p className="text-muted mt-1 text-xs">{t.rules}</p>
      </div>
      <aside className="mt-6 lg:sticky lg:top-8 lg:mt-0">
        <ProgressCard progress={progress} />
      </aside>
    </div>
  );
}

export default function LeaderboardPage(props: PageProps<'/leaderboard'>) {
  return (
    <main className="pt-2">
      <h1 className="font-display text-2xl font-semibold">{copy.compete.title}</h1>
      <p className="text-muted mt-1 mb-4 text-sm">{copy.compete.intro}</p>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="bg-line/60 h-80 animate-pulse rounded-[var(--radius-card)]"
          />
        }
      >
        <Board searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
