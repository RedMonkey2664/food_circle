'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExplorePlace } from '@/app/api/places/in-view/route';
import { setWantToGo } from '@/lib/actions/places';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { mapCard } from '@/lib/domain/mapCard';
import { PLACE_TYPE_LABEL, type PlaceType } from '@/lib/domain/place';
import { MapView, type MapPin, type MapViewport } from './MapView';

type Filter = 'both' | 'been' | 'want';
const EXPLORE_TYPES: PlaceType[] = [
  'cafe',
  'restaurant',
  'street_stall',
  'bakery',
  'sweet_shop',
  'bar',
];
/** Matches the server's limit: bigger views ask you to zoom in instead of loading the city. */
const MAX_SPAN = 0.25;
const chip = 'min-h-10 rounded-full border px-3 text-sm font-medium transition-colors duration-150';

function explorePin(p: ExplorePlace): MapPin {
  return {
    id: `explore-${p.id}`,
    lat: p.lat,
    lng: p.lng,
    kind: 'explore',
    name: p.name,
    href: `/place/${p.id}`,
    card: mapCard({
      kind: 'explore',
      name: p.name,
      areaName: p.areaName,
      type: p.type,
      cuisineTags: p.cuisineTags,
      dietFlags: p.dietFlags,
      verdict: null,
      onlyForText: null,
      visits: 0,
      lastVisited: null,
      savedAt: null,
    }),
  };
}

/**
 * P5-06 + P5-11 + Explore: your Been and Want to go pins, plus (optionally) places you haven't
 * tried in the visible area, filtered by type and pure veg. Save straight from a pin.
 */
export function DiaryMap({ pins }: { pins: MapPin[] }) {
  const t = copy.diary;
  const [filter, setFilter] = useState<Filter>('both');
  const [exploreOn, setExploreOn] = useState(false);
  const [types, setTypes] = useState<PlaceType[]>(['cafe']);
  const [veg, setVeg] = useState(false);
  const [view, setView] = useState<MapViewport | null>(null);
  const [explore, setExplore] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<MapPin[]>([]); // saved from the map this session
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const tooWide = view
    ? view.maxLat - view.minLat > MAX_SPAN || view.maxLng - view.minLng > MAX_SPAN
    : true;

  useEffect(() => {
    if (!exploreOn || !view || tooWide) {
      abort.current?.abort();
      return;
    }
    const controller = new AbortController();
    abort.current?.abort();
    abort.current = controller;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const qs = new URLSearchParams({
        minLat: view.minLat.toFixed(5),
        minLng: view.minLng.toFixed(5),
        maxLat: view.maxLat.toFixed(5),
        maxLng: view.maxLng.toFixed(5),
        ...(types.length ? { types: types.join(',') } : {}),
        ...(veg ? { veg: '1' } : {}),
      });
      try {
        const res = await fetch(`/api/places/in-view?${qs}`, { signal: controller.signal });
        if (!res.ok) return;
        const body = (await res.json()) as { places?: ExplorePlace[] };
        setExplore((body.places ?? []).map(explorePin));
      } catch {
        // aborted by a newer pan or filter change
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [exploreOn, view, tooWide, types, veg]);

  // Saving refreshes the page data, so the server's pins may already include a place saved
  // here: keep only the local copies the server doesn't have yet (no duplicates).
  const allOwn = useMemo(() => {
    const fromServer = new Set(pins.map((p) => p.href));
    return [...pins, ...saved.filter((p) => !fromServer.has(p.href))];
  }, [pins, saved]);
  const own = useMemo(
    () => (filter === 'both' ? allOwn : allOwn.filter((p) => p.kind === filter)),
    [allOwn, filter],
  );
  const ownHrefs = useMemo(() => new Set(allOwn.map((p) => p.href)), [allOwn]);
  const shown = useMemo(
    () => (exploreOn ? [...explore.filter((p) => !ownHrefs.has(p.href)), ...own] : own),
    [exploreOn, explore, own, ownHrefs],
  );

  const onSave = useCallback(
    async (pin: MapPin) => {
      setError(null);
      const placeId = pin.href.replace('/place/', '');
      const asWant: MapPin = {
        ...pin,
        id: `want-${placeId}`,
        kind: 'want',
        card: pin.card
          ? { ...pin.card, badge: 'Want to go', lines: [...pin.card.lines, 'Saved just now'] }
          : undefined,
      };
      setSaved((s) => [...s, asWant]); // optimistic: the + becomes a ★ right away
      const r = await setWantToGo({ placeId, save: true });
      if (!r.ok) {
        setSaved((s) => s.filter((p) => p.id !== asWant.id));
        setError(t.saveFailed);
      }
    },
    [t.saveFailed],
  );

  const want = allOwn.filter((p) => p.kind === 'want');

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
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
        <button
          type="button"
          role="switch"
          aria-checked={exploreOn}
          onClick={() => setExploreOn((v) => !v)}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-150',
            exploreOn ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink',
          )}
        >
          <span aria-hidden>+</span>
          {t.explore}
        </button>
      </div>

      {exploreOn ? (
        <div className="border-line bg-surface mt-3 rounded-[var(--radius-card)] border p-3">
          <p className="text-muted text-xs">{t.exploreHint}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXPLORE_TYPES.map((ty) => {
              const on = types.includes(ty);
              return (
                <button
                  key={ty}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTypes(on ? types.filter((x) => x !== ty) : [...types, ty])}
                  className={cn(
                    chip,
                    on ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface',
                  )}
                >
                  {PLACE_TYPE_LABEL[ty]}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={veg}
              onClick={() => setVeg((v) => !v)}
              className={cn(
                chip,
                veg ? 'border-veg bg-go-soft text-veg' : 'border-line bg-surface',
              )}
            >
              {t.pureVeg}
            </button>
          </div>
          <p className="mt-2 text-sm" aria-live="polite">
            {tooWide
              ? t.exploreZoom
              : loading
                ? t.exploreLoading
                : explore.length === 0
                  ? t.exploreNone
                  : t.exploreCount(explore.length)}
          </p>
        </div>
      ) : null}

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
        {exploreOn ? (
          <span>
            <span
              aria-hidden
              className="border-muted bg-surface text-ink mr-1 inline-flex size-4 items-center justify-center rounded-full border text-[10px] font-bold"
            >
              +
            </span>
            {t.legendExplore}
          </span>
        ) : null}
      </p>
      {error ? (
        <p role="alert" className="text-skip mt-2 text-sm">
          {error}
        </p>
      ) : null}

      {pins.length === 0 && !exploreOn ? (
        <p className="text-muted mt-2 text-sm">{t.mapEmpty}</p>
      ) : null}
      <MapView
        pins={shown}
        onViewChange={setView}
        onSave={onSave}
        ariaLabel={t.mapLabel}
        className="mt-3 h-[60vh] min-h-80"
      />

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
                  {(p.subtitle ?? p.card?.lines[0]) ? (
                    <span className="text-muted text-sm">{p.subtitle ?? p.card?.lines[0]}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
