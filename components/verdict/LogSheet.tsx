'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { CircleCloseLink } from '@/components/motion/CircleLink';
import { buttonClass } from '@/components/ui/Button';
import { ActionButton } from '@/components/social/ActionButton';
import { Avatar } from '@/components/social/Avatar';
import { followUser } from '@/lib/actions/social';
import { afterLogSuggestions, logVisit, type AfterLogPerson } from '@/lib/actions/visits';
import { track } from '@/lib/analytics';
import { copy } from '@/lib/copy';
import type { Verdict } from '@/lib/domain/verdict';
import type { Visibility } from '@/lib/domain/visibility';
import { LogFeedback } from '@/components/compete/LogFeedback';
import { QuickExtras } from '@/components/review/QuickExtras';
import { VerdictButtons } from './VerdictButtons';
import { VerdictLabel } from './VerdictLabel';
import { VisibilityPicker, type PickerGroup } from './VisibilityPicker';

/** Today's date in IST (the product day), for the date picker's max. */
function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

type Props = {
  place: { id: string; name: string; areaName: string | null };
  defaultVisibility: Visibility;
  isPrivateAccount: boolean;
  counts: { friends: number; followers: number };
  groups?: PickerGroup[];
  /** Top dishes here, offered as one-tap chips after saving (P4-01). */
  dishSuggestions?: string[];
  /** P5-09: log an earlier day (YYYY-MM-DD, IST). Counts toward all-time only. */
  initialDate?: string;
};

/**
 * The 10-second log (UI_UX.md §4.5). Step 1: tap a verdict, which saves immediately.
 * Step 2: success, with optional extras later (Phase 4). Only the verdict is required.
 */
export function LogSheet({
  place,
  defaultVisibility,
  isPrivateAccount,
  counts,
  groups = [],
  dishSuggestions = [],
  initialDate,
}: Props) {
  const [visitedOn, setVisitedOn] = useState<string | undefined>(initialDate);
  const [pickDate, setPickDate] = useState(Boolean(initialDate));
  const [visibility, setVisibility] = useState<Visibility>(defaultVisibility);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [saved, setSaved] = useState<{
    verdict: Verdict;
    onlyFor?: string;
    visitId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [others, setOthers] = useState<{ people: AfterLogPerson[]; othersCount: number } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const t = copy.log;

  function save(verdict: Verdict, onlyForText?: string) {
    setError(null);
    startTransition(async () => {
      const r = await logVisit({
        placeId: place.id,
        verdict,
        onlyForText,
        visibility,
        ...(visitedOn ? { visitedOn } : {}),
        ...(visibility === 'friends' && groupIds.length ? { groupIds } : {}),
      });
      if (!r.ok) return setError(r.message);
      track('log_saved');
      setSaved({ verdict, onlyFor: onlyForText, visitId: r.data.visitId });
      // P2-04: who else logged this, that you could follow (never blocks the success state).
      afterLogSuggestions(place.id).then(setOthers, () => setOthers(null));
    });
  }

  if (saved) {
    return (
      <section
        aria-live="polite"
        className="border-line bg-surface rounded-[var(--radius-card)] border p-5"
      >
        <p className="font-display text-2xl font-semibold">{t.logged}</p>
        <p className="mt-2">
          {place.name}: <VerdictLabel verdict={saved.verdict} onlyForText={saved.onlyFor} />
        </p>
        <LogFeedback visitId={saved.visitId} />
        <QuickExtras visitId={saved.visitId} suggestions={dishSuggestions} />
        {others && others.people.length > 0 ? (
          <div className="border-line mt-5 border-t pt-4">
            <p className="font-semibold">{t.othersLogged(others.othersCount)}</p>
            <ul className="mt-2 space-y-2">
              {others.people.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <Avatar name={p.displayName} url={p.avatarUrl} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.displayName}</span>
                    <span className="block text-xs">
                      <VerdictLabel verdict={p.verdict} />
                    </span>
                  </span>
                  <ActionButton
                    action={followUser}
                    fields={{ userId: p.id }}
                    label={copy.social.follow}
                    pendingLabel={copy.social.sending}
                    doneLabel={p.isPrivate ? copy.social.followRequested : copy.social.following}
                    variant="secondary"
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <CircleCloseLink href={`/place/${place.id}`} className={buttonClass()}>
            {t.done}
          </CircleCloseLink>
          <Link href="/log" className={buttonClass({ variant: 'secondary' })}>
            {t.logAnother}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="border-line bg-surface space-y-4 rounded-[var(--radius-card)] border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display truncate text-xl font-semibold">{place.name}</p>
          {place.areaName ? <p className="text-muted text-sm">{place.areaName}</p> : null}
        </div>
        <Link
          href="/log"
          className="text-primary min-h-11 shrink-0 px-2 py-2 text-sm font-semibold"
        >
          {t.change}
        </Link>
      </div>
      <VerdictButtons onSelect={save} disabled={pending} />
      {pickDate ? (
        <div className="flex items-center gap-2">
          <label htmlFor="visited-on" className="text-sm font-semibold">
            {copy.diary.backdated}
          </label>
          <input
            id="visited-on"
            type="date"
            value={visitedOn ?? ''}
            max={todayIst()}
            onChange={(e) => setVisitedOn(e.target.value || undefined)}
            className="border-line bg-bg min-h-11 rounded-[var(--radius-button)] border-2 px-2 text-sm"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickDate(true)}
          className="text-muted min-h-11 text-sm font-medium underline-offset-2 hover:underline"
        >
          {copy.diary.backdated}?
        </button>
      )}
      <VisibilityPicker
        value={visibility}
        onChange={setVisibility}
        isPrivateAccount={isPrivateAccount}
        counts={counts}
        groups={groups}
        selectedGroups={groupIds}
        onGroupsChange={setGroupIds}
      />
      {pending ? (
        <p className="text-muted text-sm" aria-live="polite">
          {t.saving}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-skip text-sm">
          {error}
        </p>
      ) : null}
    </section>
  );
}
