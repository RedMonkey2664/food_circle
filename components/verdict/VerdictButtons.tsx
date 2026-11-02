'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { GoIcon, OnlyForIcon, SkipIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { ONLY_FOR_MAX, VERDICT_LABEL, type Verdict } from '@/lib/domain/verdict';

type Props = {
  /** Called the moment the user commits: GO/SKIP on tap, ONLY FOR on save. */
  onSelect: (verdict: Verdict, onlyForText?: string) => void;
  value?: Verdict | null;
  disabled?: boolean;
  onlyForPlaceholder?: string;
};

const tiles: Array<{ verdict: Verdict; Icon: typeof GoIcon; idle: string; picked: string }> = [
  {
    verdict: 'go',
    Icon: GoIcon,
    idle: 'bg-surface text-go border-go/60',
    picked: 'bg-go text-white border-go',
  },
  {
    verdict: 'skip',
    Icon: SkipIcon,
    idle: 'bg-surface text-skip border-skip/60',
    picked: 'bg-skip text-white border-skip',
  },
  {
    verdict: 'only_for',
    Icon: OnlyForIcon,
    idle: 'bg-surface text-onlyfor border-onlyfor/60',
    picked: 'bg-onlyfor text-white border-onlyfor',
  },
];

/**
 * The one required input in the log flow. Three big one-thumb targets.
 * GO and SKIP commit on tap; ONLY FOR reveals one short line (max 60 chars).
 */
export function VerdictButtons({
  onSelect,
  value = null,
  disabled = false,
  onlyForPlaceholder = 'the misal',
}: Props) {
  const [openOnlyFor, setOpenOnlyFor] = useState(value === 'only_for');
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  function tap(verdict: Verdict) {
    if (verdict === 'only_for') {
      setOpenOnlyFor(true);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    setOpenOnlyFor(false);
    onSelect(verdict);
  }

  function submitOnlyFor(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSelect('only_for', trimmed);
  }

  const shown = openOnlyFor ? 'only_for' : value;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Your verdict">
        {tiles.map(({ verdict, Icon, idle, picked }) => {
          const active = shown === verdict;
          return (
            <button
              key={verdict}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => tap(verdict)}
              className={cn(
                'flex min-h-22 flex-col items-center justify-center gap-1.5 rounded-[var(--radius-card)] border-2',
                'text-base font-extrabold tracking-wide',
                'transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-[0.96]',
                'disabled:opacity-50',
                active ? picked : idle,
              )}
            >
              <Icon size={28} strokeWidth={2.25} />
              <span>{VERDICT_LABEL[verdict]}</span>
            </button>
          );
        })}
      </div>

      {openOnlyFor ? (
        <form onSubmit={submitOnlyFor} className="mt-3 flex gap-2">
          <label htmlFor={inputId} className="sr-only">
            Only for what?
          </label>
          <div className="border-onlyfor/60 bg-surface focus-within:border-onlyfor focus-within:ring-onlyfor/25 flex min-h-11 flex-1 items-center rounded-[var(--radius-button)] border-2 px-3 focus-within:ring-2">
            <span className="text-onlyfor mr-1.5 shrink-0 text-sm font-bold" aria-hidden>
              only for
            </span>
            <input
              ref={inputRef}
              id={inputId}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, ONLY_FOR_MAX))}
              maxLength={ONLY_FOR_MAX}
              placeholder={onlyForPlaceholder}
              autoComplete="off"
              enterKeyHint="done"
              className="text-ink placeholder:text-muted min-w-0 flex-1 bg-transparent py-2 outline-none focus-visible:outline-none"
              disabled={disabled}
            />
          </div>
          <button
            type="submit"
            disabled={disabled || !text.trim()}
            className="bg-onlyfor min-h-11 rounded-[var(--radius-button)] px-4 font-bold text-white transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
          >
            Save
          </button>
        </form>
      ) : null}
    </div>
  );
}
