'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { createGroup } from '@/lib/actions/groups';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';

const KINDS = ['family', 'friends', 'custom'] as const;

/** Name + type. Every group starts private with no leaderboard (P3-06). */
export function CreateGroupForm() {
  const [state, action, pending] = useActionState(createGroup, null);
  const [kind, setKind] = useState<(typeof KINDS)[number]>('family');
  const t = copy.groups;
  return (
    <form
      action={action}
      className="border-line bg-surface rounded-[var(--radius-card)] border p-4"
    >
      <label htmlFor="group-name" className="font-semibold">
        {t.nameLabel}
      </label>
      <input
        id="group-name"
        name="name"
        required
        maxLength={40}
        placeholder={t.namePlaceholder}
        autoComplete="off"
        className="border-line bg-bg focus:border-primary mt-2 min-h-12 w-full rounded-[var(--radius-button)] border-2 px-3 focus:outline-none"
      />
      <fieldset className="mt-4">
        <legend className="font-semibold">{t.kindLabel}</legend>
        <input type="hidden" name="kind" value={kind} />
        <div className="mt-2 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                'min-h-11 rounded-full border px-4 text-sm font-medium transition-colors duration-(--dur-tap)',
                kind === k
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-line bg-surface text-ink',
              )}
            >
              {t.kinds[k]}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="text-muted mt-3 text-xs">{t.privateNote}</p>
      <Button type="submit" fullWidth className="mt-4" disabled={pending}>
        {pending ? t.creating : t.create}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="text-skip mt-2 text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
