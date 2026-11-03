'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { CircleCloseLink } from '@/components/motion/CircleLink';
import { buttonClass } from '@/components/ui/Button';
import { ActionButton } from '@/components/social/ActionButton';
import { Avatar } from '@/components/social/Avatar';
import { followUser } from '@/lib/actions/social';
import { afterLogSuggestions, logVisit, type AfterLogPerson } from '@/lib/actions/visits';
import { copy } from '@/lib/copy';
import type { Verdict } from '@/lib/domain/verdict';
import type { Visibility } from '@/lib/domain/visibility';
import { VerdictButtons } from './VerdictButtons';
import { VerdictLabel } from './VerdictLabel';
import { VisibilityPicker } from './VisibilityPicker';

type Props = {
  place: { id: string; name: string; areaName: string | null };
  defaultVisibility: Visibility;
  isPrivateAccount: boolean;
  counts: { friends: number; followers: number };
};

/**
 * The 10-second log (UI_UX.md §4.5). Step 1: tap a verdict, which saves immediately.
 * Step 2: success, with optional extras later (Phase 4). Only the verdict is required.
 */
export function LogSheet({ place, defaultVisibility, isPrivateAccount, counts }: Props) {
  const [visibility, setVisibility] = useState<Visibility>(defaultVisibility);
  const [saved, setSaved] = useState<{ verdict: Verdict; onlyFor?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [others, setOthers] = useState<{ people: AfterLogPerson[]; othersCount: number } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const t = copy.log;

  function save(verdict: Verdict, onlyForText?: string) {
    setError(null);
    startTransition(async () => {
      const r = await logVisit({ placeId: place.id, verdict, onlyForText, visibility });
      if (!r.ok) return setError(r.message);
      setSaved({ verdict, onlyFor: onlyForText });
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
        <p className="text-muted mt-1 text-sm">{t.moreLater}</p>
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
      <VisibilityPicker
        value={visibility}
        onChange={setVisibility}
        isPrivateAccount={isPrivateAccount}
        counts={counts}
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
