'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import type { Map as MlMap, Marker } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { MAP_STYLE_URL, MUMBAI_CENTER } from '@/lib/config';

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  kind: 'been' | 'want';
  name: string;
  subtitle?: string;
  href: string;
};

type Props = {
  pins?: MapPin[];
  /** Pin-drop mode: a draggable marker; tapping the map moves it. */
  pick?: { lat: number; lng: number } | null;
  onPick?: (p: { lat: number; lng: number }) => void;
  className?: string;
  ariaLabel: string;
};

const PIN_STYLE: Record<MapPin['kind'], { bg: string; glyph: string; label: string }> = {
  been: { bg: 'var(--c-primary)', glyph: '✓', label: 'Been' },
  want: { bg: 'var(--c-following-fg)', glyph: '★', label: 'Want to go' },
};

function pinElement(pin: MapPin): HTMLElement {
  const s = PIN_STYLE[pin.kind];
  const el = document.createElement('a');
  el.href = pin.href;
  el.setAttribute('aria-label', `${s.label}: ${pin.name}`);
  el.title = `${pin.name}${pin.subtitle ? ` · ${pin.subtitle}` : ''}`;
  // Glyph + colour, so the two kinds never rely on colour alone.
  el.style.cssText = `display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${s.bg};color:#fff;font:700 14px/1 system-ui;border:2px solid #fff;box-shadow:0 2px 6px rgb(0 0 0/.35);text-decoration:none`;
  el.textContent = s.glyph;
  return el;
}

/**
 * MapLibre map with OSM-based tiles (no paid key). The library loads only when this
 * component mounts, so pages without a map never download it (CLAUDE.md rule 6).
 */
export function MapView({ pins = [], pick = null, onPick, className, ariaLabel }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const picker = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    void import('maplibre-gl')
      .then(({ default: ml }) => {
        if (cancelled || !box.current) return;
        const start = pick ?? pins[0] ?? MUMBAI_CENTER;
        const m = new ml.Map({
          container: box.current,
          style: MAP_STYLE_URL,
          center: [start.lng, start.lat],
          zoom: pick ? 16 : pins.length ? 12 : 11,
          attributionControl: { compact: true },
          cooperativeGestures: !onPickRef.current,
        });
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        m.on('click', (e) => onPickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
        m.on('load', () => setReady(true));
        map.current = m;
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once; pins/pick sync below
  }, []);

  // Sync the pins.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    let cancelled = false;
    void import('maplibre-gl').then(({ default: ml }) => {
      if (cancelled) return;
      for (const mk of markers.current) mk.remove();
      markers.current = pins.map((p) =>
        new ml.Marker({ element: pinElement(p) }).setLngLat([p.lng, p.lat]).addTo(m),
      );
      if (pins.length > 1) {
        const b = new ml.LngLatBounds();
        for (const p of pins) b.extend([p.lng, p.lat]);
        m.fitBounds(b, { padding: 48, maxZoom: 15, duration: 0 });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pins, ready]);

  // Sync the draggable pick marker.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    let cancelled = false;
    void import('maplibre-gl').then(({ default: ml }) => {
      if (cancelled) return;
      if (!pick) {
        picker.current?.remove();
        picker.current = null;
        return;
      }
      if (!picker.current) {
        picker.current = new ml.Marker({ color: '#c2410c', draggable: true })
          .setLngLat([pick.lng, pick.lat])
          .addTo(m);
        picker.current.on('dragend', () => {
          const ll = picker.current?.getLngLat();
          if (ll) onPickRef.current?.({ lat: ll.lat, lng: ll.lng });
        });
      } else {
        picker.current.setLngLat([pick.lng, pick.lat]);
      }
      // Zoom to street level so the pin can be placed precisely (never zoom back out).
      m.easeTo({ center: [pick.lng, pick.lat], zoom: Math.max(m.getZoom(), 16), duration: 400 });
    });
    return () => {
      cancelled = true;
    };
  }, [pick, ready]);

  return (
    <div className={className}>
      <div
        ref={box}
        role="region"
        aria-label={ariaLabel}
        className="bg-line/40 relative size-full overflow-hidden rounded-[var(--radius-card)]"
      />
      {failed ? (
        <p role="alert" className="text-skip mt-2 text-sm">
          The map could not load. Check your connection.
        </p>
      ) : null}
    </div>
  );
}
