'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { saveMemory } from '@/lib/actions/memory';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { PhotoGrid, type GridPhoto } from './PhotoGrid';

type Friend = { id: string; name: string };

const chip =
  'min-h-11 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150';
const on = 'border-primary bg-primary-soft text-primary';
const off = 'border-line bg-surface';

/** P5-07/P5-08: the private memory layer on one of your visits. Default: only you. */
export function MemoryEditor({
  visitId,
  userId,
  friends,
  initial,
}: {
  visitId: string;
  userId: string;
  friends: Friend[];
  initial: {
    privateNote: string;
    mood: string;
    occasion: string;
    visibility: 'private' | 'friends';
    companions: string[];
    photos: GridPhoto[];
  };
}) {
  const t = copy.memory;
  const [note, setNote] = useState(initial.privateNote);
  const [mood, setMood] = useState(initial.mood);
  const [occasion, setOccasion] = useState(initial.occasion);
  const [visibility, setVisibility] = useState(initial.visibility);
  const [companions, setCompanions] = useState(initial.companions);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    setMessage(null);
    start(async () => {
      const r = await saveMemory({
        visitId,
        privateNote: note,
        mood,
        occasion,
        visibility,
        companions,
      });
      if (r.ok) setMessage(t.saved);
      else setError(r.message);
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="mem-note" className="text-sm font-semibold">
          {t.note}
        </label>
        <textarea
          id="mem-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder={t.notePlaceholder}
          className="border-line bg-bg focus:border-primary mt-2 w-full rounded-[var(--radius-button)] border-2 p-3 focus:outline-none"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">{t.mood}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {t.moods.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mood === m}
              onClick={() => setMood(mood === m ? '' : m)}
              className={cn(chip, mood === m ? on : off)}
            >
              {m}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="mem-occasion" className="text-sm font-semibold">
          {t.occasion}
        </label>
        <input
          id="mem-occasion"
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
          maxLength={60}
          placeholder={t.occasionPlaceholder}
          className="border-line bg-bg focus:border-primary mt-2 min-h-11 w-full rounded-[var(--radius-button)] border-2 px-3 focus:outline-none"
        />
      </div>

      {friends.length > 0 ? (
        <fieldset>
          <legend className="text-sm font-semibold">{t.with}</legend>
          <p className="text-muted text-xs">{t.withHint}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {friends.map((f) => {
              const sel = companions.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={sel}
                  onClick={() =>
                    setCompanions(
                      sel ? companions.filter((x) => x !== f.id) : [...companions, f.id],
                    )
                  }
                  className={cn(chip, sel ? on : off)}
                >
                  {f.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <fieldset>
        <legend className="text-sm font-semibold">{t.visibility}</legend>
        <div role="radiogroup" className="mt-2 grid grid-cols-2 gap-2">
          {(['private', 'friends'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={visibility === v}
              onClick={() => setVisibility(v)}
              className={cn(
                'bg-surface min-h-11 rounded-[var(--radius-button)] border-2 px-2 text-sm font-medium',
                visibility === v ? 'border-primary text-primary' : 'border-line',
              )}
            >
              {v === 'private' ? t.onlyMe : t.friends}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <p className="text-sm font-semibold">{t.photos}</p>
        <PhotoGrid visitId={visitId} userId={userId} kind="memory" initial={initial.photos} />
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
      <Button type="button" variant="secondary" fullWidth onClick={save} disabled={pending}>
        {pending ? copy.review.saving : t.save}
      </Button>
    </div>
  );
}
