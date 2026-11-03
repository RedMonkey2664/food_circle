'use client';

import { useState, useTransition } from 'react';
import { setWantToGo } from '@/lib/actions/places';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';

/** P5-11: save a place to Want to go (private). Optimistic toggle; reverts on error. */
export function WantToGoButton({
  placeId,
  initialSaved,
  fromVisit,
  compact = false,
}: {
  placeId: string;
  initialSaved: boolean;
  fromVisit?: string;
  compact?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();
  const t = copy.placeExtra;

  function toggle() {
    const next = !saved;
    setSaved(next);
    start(async () => {
      const r = await setWantToGo({ placeId, save: next, ...(fromVisit ? { fromVisit } : {}) });
      if (!r.ok) setSaved(!next);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      disabled={pending}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-button)] border font-semibold transition-colors duration-150',
        compact ? 'min-h-9 px-2.5 text-xs' : 'min-h-11 w-full px-4 text-sm',
        saved
          ? 'border-following-fg bg-following-bg text-following-fg'
          : 'border-line bg-surface text-ink hover:border-muted',
      )}
    >
      <span aria-hidden>{saved ? '★' : '☆'}</span>
      {saved ? t.saved : compact ? t.save : t.wantToGo}
    </button>
  );
}
