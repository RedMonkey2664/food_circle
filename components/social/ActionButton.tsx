'use client';

import { useActionState } from 'react';
import { Scribble } from '@/components/brand/Scribble';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { ActionResult } from '@/lib/domain/errors';

type ServerAction = (
  prev: ActionResult<unknown> | null,
  formData: FormData,
) => Promise<ActionResult<unknown>>;

/**
 * One-button form for a social server action. Shows a pending label and the friendly error
 * message if the action fails. Works without JavaScript too (plain form post).
 */
export function ActionButton({
  action,
  fields,
  label,
  pendingLabel,
  variant = 'secondary',
  size = 'md',
  className,
  confirm,
  doneLabel,
}: {
  action: ServerAction;
  fields: Record<string, string>;
  label: string;
  pendingLabel?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  /** Optional sentence shown in a native confirm() before destructive actions. */
  confirm?: string;
  /** Shown (disabled) after success, for places the page does not re-render (e.g. the log sheet). */
  doneLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  // It worked: a marker line draws under the label once, then fades (Ribbon Draw).
  const done = state?.ok ? (
    <Scribble shape="underline" color="currentColor" fade className="inset-x-3 bottom-1 h-2" />
  ) : null;
  if (doneLabel && state?.ok) {
    return (
      <Button
        type="button"
        variant="ghost"
        size={size}
        disabled
        className={cn('relative', className)}
      >
        {doneLabel}
        {done}
      </Button>
    );
  }
  return (
    <form
      action={formAction}
      className="inline-flex flex-col items-end"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Button
        type="submit"
        variant={variant}
        size={size}
        disabled={pending}
        className={cn('relative', className)}
      >
        {pending ? (pendingLabel ?? label) : label}
        {pending ? null : done}
      </Button>
      {state && !state.ok ? (
        <span role="alert" className="text-skip mt-1 max-w-48 text-right text-xs">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
