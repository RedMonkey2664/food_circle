'use client';

import { useState } from 'react';
import { VerdictButtons } from '@/components/verdict/VerdictButtons';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { VERDICT_LABEL, type Verdict } from '@/lib/domain/verdict';

const TONE: Record<Verdict, string> = {
  go: 'text-go',
  skip: 'text-skip',
  only_for: 'text-onlyfor',
};

/**
 * The marketing page's "try it" card: the app's real verdict buttons on an example place.
 * Nothing is saved or sent anywhere; tapping stamps the card and shows what would happen.
 */
export function VerdictDemo() {
  const t = copy.landing.demo;
  const [pick, setPick] = useState<{ verdict: Verdict; text?: string; n: number } | null>(null);

  const message = !pick
    ? null
    : pick.verdict === 'only_for'
      ? t.result.only_for(pick.text?.trim() || t.onlyForPlaceholder)
      : t.result[pick.verdict];

  return (
    <div className="lp-demo p-5 sm:p-6">
      <p className="text-muted text-xs font-bold tracking-[0.16em] uppercase">{t.example}</p>
      <div className="mt-2 flex min-h-[4.5rem] items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-2xl leading-tight font-semibold">{t.placeName}</p>
          <p className="text-muted text-sm">{t.placeWhere}</p>
        </div>
        {/* The stamp's spot is always reserved, so nothing shifts when it lands. */}
        <div aria-hidden className="flex h-[4.5rem] w-[7.5rem] shrink-0 items-center justify-end">
          {pick ? (
            <span className="-rotate-6">
              <span
                key={pick.n}
                className={cn('lp-bigstamp sk-stamp-in relative text-lg', TONE[pick.verdict])}
                style={{ transformOrigin: '50% 50%' }}
              >
                {VERDICT_LABEL[pick.verdict]}
              </span>
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-3 mb-2 font-semibold">{t.prompt}</p>
      <VerdictButtons
        value={pick?.verdict ?? null}
        onlyForPlaceholder={t.onlyForPlaceholder}
        onSelect={(verdict, text) =>
          setPick((p) => ({ verdict, ...(text ? { text } : {}), n: (p?.n ?? 0) + 1 }))
        }
      />
      <div aria-live="polite" className="mt-4 min-h-[4.25rem] text-sm">
        {message ? (
          <>
            <p key={pick?.n} className="lp-rise font-semibold">
              {message}
            </p>
            <p className="text-muted mt-1">{t.again}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
