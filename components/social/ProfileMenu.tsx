'use client';

import { useActionState } from 'react';
import { blockUser, removeFollower, removeFriend, reportContent } from '@/lib/actions/social';
import { copy } from '@/lib/copy';
import { ActionButton } from './ActionButton';

/**
 * "More" menu on someone's profile: unfriend, remove follower, block, report.
 * A native <details> keeps it keyboard-accessible with no extra JS for opening.
 */
export function ProfileMenu({
  userId,
  displayName,
  isFriend,
  followsYou,
}: {
  userId: string;
  displayName: string;
  isFriend: boolean;
  followsYou: boolean;
}) {
  const t = copy.profile.menu;
  return (
    <details className="relative">
      <summary
        aria-label={t.label}
        className="border-line bg-surface flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-[var(--radius-button)] border text-xl leading-none [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden>⋯</span>
      </summary>
      <div className="border-line bg-surface absolute right-0 z-10 mt-2 w-64 space-y-1 rounded-[var(--radius-card)] border p-2 shadow-lg">
        {isFriend ? (
          <ActionButton
            action={removeFriend}
            fields={{ userId }}
            label={copy.social.unfriend}
            variant="ghost"
            className="w-full justify-start"
            confirm={t.unfriendConfirm(displayName)}
          />
        ) : null}
        {followsYou ? (
          <ActionButton
            action={removeFollower}
            fields={{ userId }}
            label={t.removeFollower}
            variant="ghost"
            className="w-full justify-start"
          />
        ) : null}
        <ActionButton
          action={blockUser}
          fields={{ userId }}
          label={copy.social.block}
          variant="ghost"
          className="text-skip w-full justify-start"
          confirm={t.blockConfirm(displayName)}
        />
        <ReportForm userId={userId} />
      </div>
    </details>
  );
}

function ReportForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(reportContent, null);
  const t = copy.profile.menu;
  if (state?.ok) return <p className="text-go px-3 py-2 text-sm">{t.reported}</p>;
  return (
    <details className="px-1">
      <summary className="hover:bg-primary-soft flex min-h-11 cursor-pointer list-none items-center rounded-[var(--radius-button)] px-3 font-semibold [&::-webkit-details-marker]:hidden">
        {copy.social.report}
      </summary>
      <form action={action} className="space-y-2 p-2">
        <input type="hidden" name="type" value="user" />
        <input type="hidden" name="id" value={userId} />
        <label htmlFor={`report-${userId}`} className="text-sm font-medium">
          {t.reportLabel}
        </label>
        <textarea
          id={`report-${userId}`}
          name="reason"
          required
          maxLength={500}
          rows={3}
          className="border-line bg-bg focus:border-primary w-full rounded-[var(--radius-button)] border-2 p-2 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-ink text-bg min-h-11 w-full rounded-[var(--radius-button)] font-semibold disabled:opacity-50"
        >
          {pending ? t.sending : t.send}
        </button>
        {state && !state.ok ? (
          <p role="alert" className="text-skip text-xs">
            {state.message}
          </p>
        ) : null}
      </form>
    </details>
  );
}
