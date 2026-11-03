'use client';

import { useState, useTransition } from 'react';
import { suggestPlaceFix } from '@/lib/actions/places';
import { copy } from '@/lib/copy';
import { PLACE_TYPE_LABEL } from '@/lib/domain/place';

const TYPES = ['restaurant', 'cafe', 'street_stall', 'bakery', 'sweet_shop', 'bar'] as const;

/** P5-05: "Report closed or moved" and "Know this? Suggest". Goes to the admin queue. */
export function PlaceFixes({ placeId }: { placeId: string }) {
  const t = copy.placeExtra;
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<(typeof TYPES)[number]>('restaurant');
  const [pending, start] = useTransition();

  function send(input: Parameters<typeof suggestPlaceFix>[0]) {
    setError(null);
    start(async () => {
      const r = await suggestPlaceFix(input);
      if (r.ok) setDone(true);
      else setError(r.message);
    });
  }

  if (done) {
    return (
      <p aria-live="polite" className="text-go mt-4 text-sm font-medium">
        {t.thanks}
      </p>
    );
  }

  return (
    <details className="mt-4">
      <summary className="text-muted min-h-11 cursor-pointer py-2 text-sm font-semibold">
        {t.report} / {t.suggest}
      </summary>
      <div className="space-y-3 pt-1">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => send({ field: 'closed', placeId })}
            className="border-line bg-surface min-h-11 rounded-[var(--radius-button)] border px-3 text-sm font-medium"
          >
            {t.reportClosed}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => send({ field: 'moved', placeId })}
            className="border-line bg-surface min-h-11 rounded-[var(--radius-button)] border px-3 text-sm font-medium"
          >
            {t.reportMoved}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="fix-type" className="text-sm">
            {t.suggestType}
          </label>
          <select
            id="fix-type"
            value={type}
            onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
            className="border-line bg-surface min-h-11 rounded-[var(--radius-button)] border px-2 text-sm"
          >
            {TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {PLACE_TYPE_LABEL[ty]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={() => send({ field: 'type', placeId, value: type })}
            className="text-primary min-h-11 px-2 text-sm font-semibold"
          >
            {t.sendSuggestion}
          </button>
        </div>
        {error ? (
          <p role="alert" className="text-skip text-sm">
            {error}
          </p>
        ) : null}
      </div>
    </details>
  );
}
