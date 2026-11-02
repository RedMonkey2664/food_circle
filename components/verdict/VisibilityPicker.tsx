'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import {
  VISIBILITY_LABEL,
  visibilityOptions,
  whoCanSee,
  type Visibility,
} from '@/lib/domain/visibility';

/**
 * "Visible to: Followers (edit)" with a plain sentence of who can see it, always shown
 * before posting (PRODUCT_SPEC.md §5). Expands to a segmented control.
 */
export function VisibilityPicker({
  value,
  onChange,
  isPrivateAccount,
  counts,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
  isPrivateAccount: boolean;
  counts: { friends: number; followers: number };
}) {
  const [open, setOpen] = useState(false);
  const t = copy.log;
  return (
    <div className="border-line bg-bg rounded-[var(--radius-card)] border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm">
          <span className="text-muted">{t.visibleTo}</span>{' '}
          <span className="font-semibold">{VISIBILITY_LABEL[value]}</span>
        </p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="text-primary min-h-11 px-2 text-sm font-semibold underline-offset-2 hover:underline"
        >
          {open ? t.done : t.edit}
        </button>
      </div>
      <p className="text-muted text-sm" aria-live="polite">
        {whoCanSee(value, isPrivateAccount, counts)}
      </p>
      {open ? (
        <div role="radiogroup" aria-label={t.visibleTo} className="mt-3 grid grid-cols-2 gap-2">
          {visibilityOptions(isPrivateAccount).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={value === v}
              onClick={() => onChange(v)}
              className={cn(
                'bg-surface min-h-11 rounded-[var(--radius-button)] border-2 px-2 text-sm font-medium',
                value === v ? 'border-primary text-primary' : 'border-line',
              )}
            >
              {VISIBILITY_LABEL[v]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
