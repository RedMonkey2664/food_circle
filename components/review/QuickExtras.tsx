'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { saveReview } from '@/lib/actions/review';
import { copy } from '@/lib/copy';
import type { Occasion } from '@/lib/domain/review';
import { DishPicker, OccasionPicker, PricePicker } from './ReviewControls';

/**
 * P4-01: optional one-tap extras right after the verdict is saved. Never required; the
 * verdict already counts. Best dishes are saved as Go dish verdicts.
 */
export function QuickExtras({ visitId, suggestions }: { visitId: string; suggestions: string[] }) {
  const [dishes, setDishes] = useState<string[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const t = copy.review;
  const touched = dishes.length > 0 || price !== null || occasions.length > 0;

  function save() {
    setError(null);
    start(async () => {
      const r = await saveReview({
        visitId,
        pricePerHead: price,
        occasions,
        dishes: dishes.map((name) => ({ name, verdict: 'go' as const })),
      });
      if (r.ok) setSaved(true);
      else setError(r.message);
    });
  }

  return (
    <div className="border-line mt-4 space-y-4 border-t pt-4">
      <p className="font-semibold">{t.quickTitle}</p>
      {saved ? (
        <p className="text-go text-sm font-medium" aria-live="polite">
          {t.saved}
        </p>
      ) : (
        <>
          <div>
            <p className="mb-2 text-sm font-semibold">{t.bestDish}</p>
            <DishPicker value={dishes} onChange={setDishes} suggestions={suggestions} />
          </div>
          <PricePicker value={price} onChange={setPrice} />
          <OccasionPicker value={occasions} onChange={setOccasions} />
          {touched ? (
            <Button type="button" variant="secondary" fullWidth onClick={save} disabled={pending}>
              {pending ? t.saving : t.save}
            </Button>
          ) : null}
          {error ? (
            <p role="alert" className="text-skip text-sm">
              {error}
            </p>
          ) : null}
        </>
      )}
      <Link
        href={`/visit/${visitId}`}
        className="text-primary inline-flex min-h-11 items-center text-sm font-semibold"
      >
        {t.addMore} ›
      </Link>
    </div>
  );
}
