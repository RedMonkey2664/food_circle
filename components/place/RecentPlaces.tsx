'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';

// Recently viewed places, stored only on this device (P1-06). Never sent anywhere.
const KEY = 'fc.recentPlaces.v1';
const MAX = 8;

export type RecentPlace = { id: string; name: string; areaName: string | null };

function read(): RecentPlace[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (p): p is RecentPlace =>
          typeof p === 'object' &&
          p !== null &&
          typeof p.id === 'string' &&
          typeof p.name === 'string',
      )
      .slice(0, MAX);
  } catch {
    return [];
  }
}

/** Records a place visit in the local list. Renders nothing. */
export function RememberPlace({ place }: { place: RecentPlace }) {
  useEffect(() => {
    try {
      const next = [place, ...read().filter((p) => p.id !== place.id)].slice(0, MAX);
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage unavailable (private mode): nothing to remember
    }
  }, [place]);
  return null;
}

const subscribe = () => () => {};

export function RecentPlaces({
  title,
  hrefFor = (id) => `/place/${id}`,
}: {
  title: string;
  hrefFor?: (id: string) => string;
}) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [items] = useState<RecentPlace[]>(() => (typeof window === 'undefined' ? [] : read()));
  if (!mounted || items.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="text-muted text-xs font-bold tracking-wide uppercase">{title}</h2>
      <ul className="divide-line mt-1 divide-y">
        {items.map((p) => (
          <li key={p.id}>
            <Link href={hrefFor(p.id)} className="flex min-h-12 flex-col justify-center py-2">
              <span className="font-medium">{p.name}</span>
              {p.areaName ? <span className="text-muted text-sm">{p.areaName}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
