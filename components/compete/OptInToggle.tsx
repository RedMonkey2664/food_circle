'use client';

import { useActionState, useState } from 'react';
import { setLeaderboardOptIn } from '@/lib/actions/competition';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';

/** Your own profile: show or hide yourself on friends' boards. You always see your own score. */
export function OptInToggle({ on: initial }: { on: boolean }) {
  const [on, setOn] = useState(initial);
  const [, action, pending] = useActionState(setLeaderboardOptIn, null);
  const t = copy.compete;
  return (
    <form action={action} className="flex items-start justify-between gap-3">
      <input type="hidden" name="on" value={on ? '0' : '1'} />
      <span>
        <span className="block text-sm font-semibold">{t.optOutLabel}</span>
        <span className="text-muted text-xs">{t.optOutHint}</span>
      </span>
      <button
        type="submit"
        role="switch"
        aria-checked={on}
        aria-label={t.optOutLabel}
        disabled={pending}
        onClick={() => setOn((v) => !v)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150',
          on ? 'bg-primary' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full bg-white shadow transition-transform duration-150',
            on ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </form>
  );
}
