'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { CloseIcon } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { deleteReview, saveReview } from '@/lib/actions/review';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { NOTE_MAX, addDish, type Occasion } from '@/lib/domain/review';
import { DictateButton } from './DictateButton';
import { PhotoGrid } from './PhotoGrid';
import { DishPicker, OccasionPicker, PricePicker } from './ReviewControls';

type Dish = { name: string; verdict: 'go' | 'skip' };

/** P4-02: note, per-dish verdicts, price, occasions and photos. Everything optional. */
export function ReviewEditor({
  visitId,
  userId,
  placeId,
  initial,
}: {
  visitId: string;
  userId: string;
  placeId: string;
  initial: {
    note: string;
    pricePerHead: number | null;
    occasions: Occasion[];
    dishes: Dish[];
    photos: { path: string; url: string }[];
    hasReview: boolean;
  };
}) {
  const router = useRouter();
  const t = copy.review;
  const [note, setNote] = useState(initial.note);
  const [price, setPrice] = useState(initial.pricePerHead);
  const [occasions, setOccasions] = useState<Occasion[]>(initial.occasions);
  const [dishes, setDishes] = useState<Dish[]>(initial.dishes);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function setDishNames(names: string[]) {
    setDishes(names.map((n) => dishes.find((d) => d.name === n) ?? { name: n, verdict: 'go' }));
  }

  function save() {
    setError(null);
    setMessage(null);
    start(async () => {
      const r = await saveReview({ visitId, note, pricePerHead: price, occasions, dishes });
      if (r.ok) {
        setMessage(t.saved);
        router.refresh();
      } else setError(r.message);
    });
  }

  function onDelete() {
    if (!window.confirm(t.deleteConfirm)) return;
    start(async () => {
      const r = await deleteReview(visitId);
      if (r.ok) router.push(`/place/${placeId}`);
      else setError(r.message);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="note" className="text-sm font-semibold">
            {t.note}
          </label>
          <DictateButton
            onText={(txt) => setNote((n) => (n ? `${n} ${txt}` : txt).slice(0, NOTE_MAX))}
          />
        </div>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={NOTE_MAX}
          rows={4}
          placeholder={t.notePlaceholder}
          className="border-line bg-bg focus:border-primary mt-2 w-full rounded-[var(--radius-button)] border-2 p-3 focus:outline-none"
        />
      </div>

      <div>
        <p className="text-sm font-semibold">{t.dishesTitle}</p>
        <p className="text-muted text-xs">{t.dishesHint}</p>
        {dishes.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {dishes.map((d) => (
              <li key={d.name} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">{d.name}</span>
                {(['go', 'skip'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={d.verdict === v}
                    onClick={() =>
                      setDishes(dishes.map((x) => (x.name === d.name ? { ...x, verdict: v } : x)))
                    }
                    className={cn(
                      'min-h-11 min-w-16 rounded-[var(--radius-button)] border-2 px-3 text-sm font-bold uppercase',
                      d.verdict === v
                        ? v === 'go'
                          ? 'border-go bg-go-soft text-go'
                          : 'border-skip bg-skip-soft text-skip'
                        : 'border-line text-muted',
                    )}
                  >
                    {v === 'go' ? 'Go' : 'Skip'}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label={`Remove ${d.name}`}
                  onClick={() => setDishes(dishes.filter((x) => x.name !== d.name))}
                  className="text-muted flex size-11 items-center justify-center"
                >
                  <CloseIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-2">
          <DishPicker
            value={[]}
            onChange={(names) =>
              setDishNames(
                addDish(
                  dishes.map((d) => d.name),
                  names[0] ?? '',
                ),
              )
            }
          />
        </div>
      </div>

      <PricePicker value={price} onChange={setPrice} />
      <OccasionPicker value={occasions} onChange={setOccasions} />

      <div>
        <p className="text-sm font-semibold">{t.photos}</p>
        <p className="text-muted text-xs">{t.photosHint}</p>
        <PhotoGrid visitId={visitId} userId={userId} kind="review" initial={initial.photos} />
      </div>

      {error ? (
        <p role="alert" className="text-skip text-sm">
          {error}
        </p>
      ) : null}
      {message ? (
        <p aria-live="polite" className="text-go text-sm font-medium">
          {message}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? t.saving : t.save}
        </Button>
        <Link
          href={`/place/${placeId}`}
          className="border-line bg-surface flex min-h-11 items-center justify-center rounded-[var(--radius-button)] border font-semibold"
        >
          {t.done}
        </Link>
      </div>
      {initial.hasReview ? (
        <button
          type="button"
          onClick={onDelete}
          className="text-skip min-h-11 text-sm font-semibold"
        >
          {t.deleteReview}
        </button>
      ) : null}
    </div>
  );
}
