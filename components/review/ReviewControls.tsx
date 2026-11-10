'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import {
  OCCASIONS,
  OCCASION_LABEL,
  PRICE,
  addDish,
  priceLabel,
  type Occasion,
} from '@/lib/domain/review';

const chip =
  'min-h-11 rounded-full border px-3.5 text-sm font-medium transition-colors duration-(--dur-tap)';
const chipOn = 'border-primary bg-primary-soft text-primary';
const chipOff = 'border-line bg-surface text-ink';

/** Dish chips: suggestions (top dishes here) to tap, plus free text. Order is kept. */
export function DishPicker({
  value,
  onChange,
  suggestions = [],
}: {
  value: string[];
  onChange: (dishes: string[]) => void;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');
  const t = copy.review;
  const extra = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));
  function add(name: string) {
    onChange(addDish(value, name));
    setDraft('');
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed
            onClick={() => onChange(value.filter((x) => x !== d))}
            className={cn(chip, chipOn)}
          >
            {d} <span aria-hidden>×</span>
          </button>
        ))}
        {extra.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={false}
            onClick={() => add(d)}
            className={cn(chip, chipOff)}
          >
            + {d}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <label className="sr-only" htmlFor="dish-draft">
          {t.dishPlaceholder}
        </label>
        <input
          id="dish-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
          maxLength={60}
          placeholder={t.dishPlaceholder}
          autoComplete="off"
          enterKeyHint="done"
          className="border-line bg-bg focus:border-primary min-h-11 min-w-0 flex-1 rounded-[var(--radius-button)] border-2 px-3 text-sm focus:outline-none"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
          className="border-line bg-surface min-h-11 rounded-[var(--radius-button)] border px-4 text-sm font-semibold disabled:opacity-50"
        >
          {t.addDish}
        </button>
      </div>
    </div>
  );
}

/** Price per head slider; unset until touched (null), so we never store a guess. */
export function PricePicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (inr: number | null) => void;
}) {
  const t = copy.review;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor="price" className="text-sm font-semibold">
          {t.price}
        </label>
        <span className="text-sm" aria-live="polite">
          {value === null ? <span className="text-muted">{t.priceUnset}</span> : priceLabel(value)}
          {value !== null ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-primary ml-2 text-xs font-semibold"
            >
              {t.clearPrice}
            </button>
          ) : null}
        </span>
      </div>
      <input
        id="price"
        type="range"
        min={PRICE.min}
        max={PRICE.max}
        step={PRICE.step}
        value={value ?? 400}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={value === null ? t.priceUnset : priceLabel(value)}
        className={cn('accent-primary mt-2 h-11 w-full', value === null && 'opacity-50')}
      />
    </div>
  );
}

export function OccasionPicker({
  value,
  onChange,
}: {
  value: Occasion[];
  onChange: (o: Occasion[]) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{copy.review.occasion}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {OCCASIONS.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
              className={cn(chip, on ? chipOn : chipOff)}
            >
              {OCCASION_LABEL[o]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
