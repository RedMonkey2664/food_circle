'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { CloseIcon } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { addPhoto, deleteReview, removePhoto, saveReview } from '@/lib/actions/review';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { MAX_PHOTOS, NOTE_MAX, addDish, type Occasion } from '@/lib/domain/review';
import { compressPhoto } from '@/lib/images/compress';
import { createClient } from '@/lib/supabase/client';
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
  const [photos, setPhotos] = useState(initial.photos);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    const supabase = createClient();
    try {
      for (const file of [...files].slice(0, MAX_PHOTOS - photos.length)) {
        const { blob, width, height } = await compressPhoto(file);
        const path = `${userId}/${visitId}/${crypto.randomUUID()}.webp`;
        const up = await supabase.storage
          .from('review-photos')
          .upload(path, blob, { contentType: 'image/webp', upsert: false });
        if (up.error) throw up.error;
        const r = await addPhoto({ visitId, path, width, height });
        if (!r.ok) throw new Error(r.message);
        setPhotos((p) => [...p, { path, url: URL.createObjectURL(blob) }]);
      }
    } catch {
      setError(t.photoFailed);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function onRemove(path: string) {
    start(async () => {
      const r = await removePhoto({ visitId, path });
      if (r.ok) setPhotos((p) => p.filter((x) => x.path !== path));
      else setError(r.message);
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
        <label htmlFor="note" className="text-sm font-semibold">
          {t.note}
        </label>
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
        <ul className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-4">
          {photos.map((p) => (
            <li
              key={p.path}
              className="relative aspect-square overflow-hidden rounded-[var(--radius-button)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URLs */}
              <img src={p.url} alt="" className="size-full object-cover" loading="lazy" />
              <button
                type="button"
                onClick={() => onRemove(p.path)}
                aria-label={t.removePhoto}
                className="bg-ink/70 text-bg absolute top-1 right-1 flex size-9 items-center justify-center rounded-full"
              >
                <CloseIcon size={16} />
              </button>
            </li>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <li>
              <label className="border-line text-muted hover:border-primary flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[var(--radius-button)] border-2 border-dashed text-sm font-medium">
                <span aria-hidden className="text-2xl">
                  +
                </span>
                {uploading ? t.uploading : t.addPhoto}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => void onFiles(e.target.files)}
                />
              </label>
            </li>
          ) : null}
        </ul>
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
        <Button type="button" onClick={save} disabled={pending || uploading}>
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
