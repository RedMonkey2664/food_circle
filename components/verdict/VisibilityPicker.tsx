'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import {
  VISIBILITY_LABEL,
  visibilityOptions,
  whoCanSee,
  whoCanSeeGroups,
  type Visibility,
} from '@/lib/domain/visibility';

export type PickerGroup = { id: string; name: string };

/**
 * "Visible to: Followers (edit)" with a plain sentence of who can see it, always shown
 * before posting (PRODUCT_SPEC.md §5). Expands to a segmented control.
 */
export function VisibilityPicker({
  value,
  onChange,
  isPrivateAccount,
  counts,
  groups = [],
  selectedGroups = [],
  onGroupsChange,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
  isPrivateAccount: boolean;
  counts: { friends: number; followers: number };
  /** Phase 3: my groups, to narrow a Friends entry ("Family says Go"). */
  groups?: PickerGroup[];
  selectedGroups?: string[];
  onGroupsChange?: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const t = copy.log;
  const narrowed = value === 'friends' ? groups.filter((g) => selectedGroups.includes(g.id)) : [];
  return (
    <div className="border-line bg-bg rounded-[var(--radius-card)] border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm">
          <span className="text-muted">{t.visibleTo}</span>{' '}
          <span className="font-semibold">
            {narrowed.length ? narrowed.map((g) => g.name).join(', ') : VISIBILITY_LABEL[value]}
          </span>
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
        {narrowed.length
          ? whoCanSeeGroups(narrowed.map((g) => g.name))
          : whoCanSee(value, isPrivateAccount, counts)}
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
      {open && value === 'friends' && groups.length > 0 && onGroupsChange ? (
        <fieldset className="mt-3">
          <legend className="text-sm font-semibold">{t.onlyGroups}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {groups.map((g) => {
              const on = selectedGroups.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    onGroupsChange(
                      on ? selectedGroups.filter((x) => x !== g.id) : [...selectedGroups, g.id],
                    )
                  }
                  className={cn(
                    'min-h-11 rounded-full border px-4 text-sm font-medium transition-colors duration-(--dur-tap)',
                    on ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface',
                  )}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
          <p className="text-muted mt-2 text-xs">{t.onlyGroupsHint}</p>
        </fieldset>
      ) : null}
    </div>
  );
}
