'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MapView } from '@/components/map/MapView';
import { Button } from '@/components/ui/Button';
import { createPlace, type Candidate, type CreatePlaceInput } from '@/lib/actions/places';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { PLACE_TYPE_LABEL } from '@/lib/domain/place';

const TYPES = ['street_stall', 'restaurant', 'cafe', 'bakery', 'sweet_shop', 'bar'] as const;
const DIETS = ['pure_veg', 'veg_options', 'jain', 'halal', 'egg'] as const;
const DIET_LABEL: Record<(typeof DIETS)[number], string> = {
  pure_veg: 'Pure veg',
  veg_options: 'Veg options',
  jain: 'Jain',
  halal: 'Halal',
  egg: 'Egg',
};

const chip =
  'min-h-11 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150';
const on = 'border-primary bg-primary-soft text-primary';
const off = 'border-line bg-surface';

/** P5-01/02: pin-drop + name, with "Is this the same as X?" before creating. */
export function AddPlaceForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const t = copy.addPlace;
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<(typeof TYPES)[number]>('street_stall');
  const [diet, setDiet] = useState<(typeof DIETS)[number][]>([]);
  const [cuisine, setCuisine] = useState('');
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [pending, start] = useTransition();

  // Location only on an explicit tap (CLAUDE.md: never request precise location unprompted).
  function locate() {
    if (!('geolocation' in navigator)) return setError(t.locationFailed);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        setPin({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {
        setLocating(false);
        setError(t.locationFailed);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function submit(force: boolean) {
    setError(null);
    if (!pin) return setError(t.needPin);
    const input: CreatePlaceInput = {
      name,
      lat: pin.lat,
      lng: pin.lng,
      type,
      dietFlags: diet,
      cuisineTags: cuisine
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
        .slice(0, 8),
      force,
    };
    start(async () => {
      const r = await createPlace(input);
      if (!r.ok) return setError(r.message);
      if (r.data.status === 'created') {
        track('place_added');
        router.push(`/log?place=${r.data.placeId}`);
      } else setCandidates(r.data.candidates);
    });
  }

  if (candidates) {
    return (
      <section
        className="border-line bg-surface rounded-[var(--radius-card)] border p-4"
        aria-live="polite"
      >
        <h2 className="font-display text-xl font-semibold">{t.sameTitle}</h2>
        <p className="text-muted mt-1 text-sm">{t.sameBody}</p>
        <ul className="divide-line mt-3 divide-y">
          {candidates.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{c.name}</span>
                <span className="text-muted text-sm">
                  {[c.areaName, t.away(c.distanceM)].filter(Boolean).join(' · ')}
                </span>
              </span>
              <Link
                href={`/log?place=${c.id}`}
                className="bg-primary text-on-primary flex min-h-11 shrink-0 items-center rounded-[var(--radius-button)] px-4 text-sm font-semibold"
              >
                {t.useThis}
              </Link>
            </li>
          ))}
        </ul>
        <Button
          variant="secondary"
          fullWidth
          className="mt-3"
          onClick={() => submit(true)}
          disabled={pending}
        >
          {pending ? t.adding : t.different}
        </Button>
        {error ? (
          <p role="alert" className="text-skip mt-2 text-sm">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <div className="space-y-5 md:grid md:grid-cols-2 md:items-start md:gap-6 md:space-y-0">
      <div>
        <MapView ariaLabel={t.tapMap} pick={pin} onPick={setPin} className="h-72 md:h-[480px]" />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-muted text-xs">{t.tapMap}</p>
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="text-primary min-h-11 shrink-0 text-sm font-semibold"
          >
            {locating ? t.locating : t.useLocation}
          </button>
        </div>
      </div>

      <form
        className="border-line bg-surface space-y-4 rounded-[var(--radius-card)] border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
      >
        <div>
          <label htmlFor="place-name" className="text-sm font-semibold">
            {t.name}
          </label>
          <input
            id="place-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            placeholder={t.namePlaceholder}
            className="border-line bg-bg focus:border-primary mt-2 min-h-12 w-full rounded-[var(--radius-button)] border-2 px-3 focus:outline-none"
          />
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">{t.type}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {TYPES.map((ty) => (
              <button
                key={ty}
                type="button"
                aria-pressed={type === ty}
                onClick={() => setType(ty)}
                className={cn(chip, type === ty ? on : off)}
              >
                {PLACE_TYPE_LABEL[ty]}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold">{t.diet}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIETS.map((d) => {
              const sel = diet.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={sel}
                  onClick={() => setDiet(sel ? diet.filter((x) => x !== d) : [...diet, d])}
                  className={cn(chip, sel ? on : off)}
                >
                  {DIET_LABEL[d]}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div>
          <label htmlFor="place-cuisine" className="text-sm font-semibold">
            {t.cuisine}
          </label>
          <input
            id="place-cuisine"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            maxLength={120}
            placeholder={t.cuisinePlaceholder}
            className="border-line bg-bg focus:border-primary mt-2 min-h-12 w-full rounded-[var(--radius-button)] border-2 px-3 focus:outline-none"
          />
        </div>
        <Button type="submit" fullWidth size="lg" disabled={pending}>
          {pending ? t.adding : t.submit}
        </Button>
        {error ? (
          <p role="alert" className="text-skip text-sm">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
