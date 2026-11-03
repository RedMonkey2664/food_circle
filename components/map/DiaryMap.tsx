'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { MapView, type MapPin } from './MapView';

type Filter = 'both' | 'been' | 'want';

/** P5-06 + P5-11: one map, Been and Want to go pins, with a toggle and a text legend. */
export function DiaryMap({ pins }: { pins: MapPin[] }) {
  const t = copy.diary;
  const [filter, setFilter] = useState<Filter>('both');
  const shown = useMemo(
    () => (filter === 'both' ? pins : pins.filter((p) => p.kind === filter)),
    [pins, filter],
  );
  const want = pins.filter((p) => p.kind === 'want');

  return (
    <div>
      <div
        role="radiogroup"
        aria-label={t.mapLabel}
        className="bg-surface border-line inline-flex rounded-[var(--radius-button)] border p-1"
      >
        {(['both', 'been', 'want'] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              'min-h-10 rounded-[calc(var(--radius-button)-4px)] px-3.5 text-sm font-medium',
              filter === f ? 'bg-primary text-on-primary' : 'text-muted',
            )}
          >
            {t.filters[f]}
          </button>
        ))}
      </div>
      <p className="text-muted mt-2 flex flex-wrap gap-x-4 text-xs">
        <span>
          <span
            aria-hidden
            className="bg-primary mr-1 inline-flex size-4 items-center justify-center rounded-full text-[9px] text-white"
          >
            ✓
          </span>
          {t.legendBeen}
        </span>
        <span>
          <span
            aria-hidden
            className="bg-following-fg mr-1 inline-flex size-4 items-center justify-center rounded-full text-[9px] text-white"
          >
            ★
          </span>
          {t.legendWant}
        </span>
      </p>
      {pins.length === 0 ? (
        <p className="text-muted mt-4 text-sm">{t.mapEmpty}</p>
      ) : (
        <MapView pins={shown} ariaLabel={t.mapLabel} className="mt-3 h-[60vh] min-h-80" />
      )}
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold">{t.wantList}</h2>
        {want.length === 0 ? (
          <p className="text-muted mt-1 text-sm">{t.wantEmpty}</p>
        ) : (
          <ul className="divide-line mt-1 divide-y">
            {want.map((p) => (
              <li key={p.id}>
                <Link href={p.href} className="flex min-h-12 flex-col justify-center py-2">
                  <span className="font-medium">{p.name}</span>
                  {p.subtitle ? <span className="text-muted text-sm">{p.subtitle}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
