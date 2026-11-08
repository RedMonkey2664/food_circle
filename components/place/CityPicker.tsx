'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { CITIES, NEAR_COOKIE, cityCenter, formatNear, type Near } from '@/lib/domain/cities';

/** Fired so an open map can fly to the new spot (DiaryMap listens). */
export const NEAR_EVENT = 'skoop:near';
export type NearEvent = CustomEvent<Near & { zoom: number }>;

function save(n: Near, zoom: number) {
  document.cookie = `${NEAR_COOKIE}=${formatNear(n)}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent(NEAR_EVENT, { detail: { ...n, zoom } }));
}

/**
 * Where search and the map start: a city (Mumbai, Delhi NCR, Goa...) or "Near me". Near me
 * reads the location only when tapped and keeps an approximate point (~1 km) on the device.
 */
export function CityPicker({ initial, className }: { initial: Near | null; className?: string }) {
  const t = copy.city;
  const router = useRouter();
  const [current, setCurrent] = useState<string>(initial?.slug ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pickCity(slug: string) {
    const c = CITIES.find((x) => x.slug === slug);
    if (!c) return;
    setCurrent(slug);
    setMsg(null);
    save({ slug, ...cityCenter(c) }, c.kind === 'metro' ? 11 : 13);
    start(() => router.refresh());
  }

  function nearMe() {
    if (!('geolocation' in navigator)) return setMsg(t.denied);
    setMsg(t.locating);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrent('me');
        setMsg(null);
        save({ slug: 'me', lat: pos.coords.latitude, lng: pos.coords.longitude }, 14);
        start(() => router.refresh());
      },
      () => setMsg(t.denied),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  const metros = CITIES.filter((c) => c.kind === 'metro');
  const getaways = CITIES.filter((c) => c.kind === 'tourist');
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} aria-busy={pending}>
      <label className="sr-only" htmlFor="city-picker">
        {t.label}
      </label>
      <span aria-hidden className="text-lg">
        📍
      </span>
      <select
        id="city-picker"
        value={current === 'me' ? 'me' : current}
        onChange={(e) => (e.target.value === 'me' ? nearMe() : pickCity(e.target.value))}
        className="border-line bg-surface min-h-11 rounded-[var(--radius-button)] border px-3 text-sm font-semibold"
      >
        <option value="" disabled>
          {t.pick}
        </option>
        {current === 'me' ? <option value="me">{t.nearYou}</option> : null}
        <optgroup label={t.metros}>
          {metros.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </optgroup>
        <optgroup label={t.getaways}>
          {getaways.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </optgroup>
      </select>
      <button
        type="button"
        onClick={nearMe}
        className={cn(
          'border-line bg-surface min-h-11 rounded-[var(--radius-button)] border px-3 text-sm font-semibold',
          current === 'me' && 'border-primary text-primary',
        )}
      >
        ◎ {t.nearMe}
      </button>
      {msg ? (
        <span role="status" className="text-muted text-xs">
          {msg}
        </span>
      ) : null}
    </div>
  );
}
