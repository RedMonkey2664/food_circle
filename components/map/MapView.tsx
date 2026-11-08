'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import type { Map as MlMap, Marker, Popup } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { MAP_STYLE_URL, MUMBAI_CENTER } from '@/lib/config';
import type { MapCard } from '@/lib/domain/mapCard';

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  /** been = ✓, want = ★, explore = + (a place you haven't tried). */
  kind: 'been' | 'want' | 'explore';
  name: string;
  subtitle?: string;
  href: string;
  /** Full details for the hover (PC) / tap (touch) card. */
  card?: MapCard;
};

export type MapViewport = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  zoom: number;
};

const VERDICT_COLOR = {
  go: 'var(--c-go)',
  skip: 'var(--c-skip)',
  only_for: 'var(--c-onlyfor)',
} as const;

const PIN_STYLE: Record<
  MapPin['kind'],
  { bg: string; fg: string; border: string; glyph: string; label: string; size: number }
> = {
  been: { bg: 'var(--c-primary)', fg: '#fff', border: '#fff', glyph: '✓', label: 'Been', size: 32 },
  want: {
    bg: 'var(--c-following-fg)',
    fg: '#fff',
    border: '#fff',
    glyph: '★',
    label: 'Want to go',
    size: 32,
  },
  explore: {
    bg: '#fff',
    fg: 'var(--c-ink)',
    border: 'var(--c-muted)',
    glyph: '+',
    label: 'To explore',
    size: 26,
  },
};

/** The card's DOM, built with textContent only (place names are user content: no innerHTML). */
function cardElement(pin: MapPin, onSave?: (pin: MapPin) => void, close?: () => void): HTMLElement {
  const s = PIN_STYLE[pin.kind];
  const root = document.createElement('div');
  root.className = 'fc-map-card';
  const badge = document.createElement('span');
  badge.className = `fc-map-badge fc-map-badge-${pin.kind}`;
  badge.textContent = `${s.glyph} ${pin.card?.badge ?? s.label}`;
  const title = document.createElement('p');
  title.className = 'fc-map-title';
  title.textContent = pin.card?.title ?? pin.name;
  root.append(badge, title);
  if (pin.card?.verdict) {
    const v = document.createElement('p');
    v.className = 'fc-map-verdict';
    v.style.color = VERDICT_COLOR[pin.card.verdict.tone];
    v.textContent = pin.card.verdict.text;
    root.append(v);
  }
  for (const line of pin.card?.lines ?? (pin.subtitle ? [pin.subtitle] : [])) {
    const p = document.createElement('p');
    p.className = 'fc-map-line';
    p.textContent = line;
    root.append(p);
  }
  const actions = document.createElement('div');
  actions.className = 'fc-map-actions';
  if (pin.kind === 'explore' && onSave) {
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'fc-map-save';
    save.textContent = '★ Save to Want to go';
    save.addEventListener('click', (e) => {
      e.stopPropagation();
      onSave(pin);
      close?.();
    });
    actions.append(save);
  }
  const link = document.createElement('a');
  link.className = 'fc-map-link';
  link.href = pin.href;
  link.textContent = 'Open place ›';
  actions.append(link);
  root.append(actions);
  return root;
}

function pinElement(pin: MapPin): HTMLButtonElement {
  const s = PIN_STYLE[pin.kind];
  // A button (not a link): hover/focus previews the card, a tap pins it open. The card has
  // the link, so touch screens (no hover) still see the details before leaving the map.
  const el = document.createElement('button');
  el.type = 'button';
  el.setAttribute('aria-label', `${s.label}: ${pin.name}. Show details`);
  // Glyph + colour + size, so the kinds never rely on colour alone.
  el.style.cssText = `display:flex;align-items:center;justify-content:center;width:${s.size}px;height:${s.size}px;border-radius:9999px;background:${s.bg};color:${s.fg};font:700 ${s.size > 28 ? 15 : 16}px/1 system-ui;border:2px solid ${s.border};box-shadow:0 2px 6px rgb(0 0 0/.3);cursor:pointer;padding:0;outline-offset:3px`;
  el.textContent = s.glyph;
  return el;
}

type Props = {
  pins?: MapPin[];
  /** Pin-drop mode: a draggable marker; tapping the map moves it. */
  pick?: { lat: number; lng: number } | null;
  onPick?: (p: { lat: number; lng: number }) => void;
  /** Called after the map stops moving (and once when it loads). */
  onViewChange?: (v: MapViewport) => void;
  /** Shown as "Save to Want to go" on explore pins. */
  onSave?: (pin: MapPin) => void;
  /** Fly here (a picked city or "near me"). A new `key` re-flies to the same spot. */
  focus?: { lat: number; lng: number; zoom: number; key: number } | null;
  className?: string;
  ariaLabel: string;
};

/**
 * MapLibre map with OSM-based tiles (no paid key). The library loads only when this
 * component mounts, so pages without a map never download it (CLAUDE.md rule 6).
 */
export function MapView({
  pins = [],
  pick = null,
  onPick,
  onViewChange,
  onSave,
  focus = null,
  className,
  ariaLabel,
}: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const popup = useRef<Popup | null>(null);
  const picker = useRef<Marker | null>(null);
  const fitted = useRef(false);
  const onPickRef = useRef(onPick);
  const onViewRef = useRef(onViewChange);
  const onSaveRef = useRef(onSave);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
    onViewRef.current = onViewChange;
    onSaveRef.current = onSave;
  }, [onPick, onViewChange, onSave]);

  // Fly to a newly chosen city / "near me".
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !focus) return;
    fitted.current = true;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    m.flyTo({
      center: [focus.lng, focus.lat],
      zoom: focus.zoom,
      essential: false,
      duration: still ? 0 : 1600,
    });
  }, [ready, focus]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    void import('maplibre-gl')
      .then(({ default: ml }) => {
        if (cancelled || !box.current) return;
        const start = pick ?? focus ?? pins[0] ?? MUMBAI_CENTER;
        // A chosen city wins over fitting the diary's pins on first load.
        if (focus && !pick) fitted.current = true;
        const m = new ml.Map({
          container: box.current,
          style: MAP_STYLE_URL,
          center: [start.lng, start.lat],
          zoom: pick ? 16 : focus ? focus.zoom : pins.length ? 12 : 11,
          attributionControl: { compact: true },
          cooperativeGestures: !onPickRef.current,
        });
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        m.on('click', (e) => onPickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
        const report = () => {
          const b = m.getBounds();
          onViewRef.current?.({
            minLat: b.getSouth(),
            minLng: b.getWest(),
            maxLat: b.getNorth(),
            maxLng: b.getEast(),
            zoom: m.getZoom(),
          });
        };
        m.on('moveend', report);
        m.on('load', () => {
          setReady(true);
          report();
        });
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
      popup.current?.remove();
      // One shared card. Hover/focus shows it; click/tap pins it until the map is tapped.
      const card: Popup = new ml.Popup({
        closeButton: false,
        closeOnClick: true,
        focusAfterOpen: false, // hovering must not steal keyboard focus
        offset: 20,
        maxWidth: '280px',
        className: 'fc-map-popup',
      });
      popup.current = card;
      let pinnedId: string | null = null;
      const show = (p: MapPin) =>
        card
          .setLngLat([p.lng, p.lat])
          .setDOMContent(cardElement(p, onSaveRef.current, () => card.remove()))
          .addTo(m);
      card.on('close', () => {
        pinnedId = null;
      });
      // Explore pins first, so your own ✓/★ pins sit on top of them.
      const ordered = [...pins].sort(
        (a, b) => Number(b.kind === 'explore') - Number(a.kind === 'explore'),
      );
      markers.current = ordered.map((p) => {
        const el = pinElement(p);
        el.addEventListener('mouseenter', () => {
          if (!pinnedId) show(p);
        });
        el.addEventListener('mouseleave', () => {
          if (!pinnedId) card.remove();
        });
        el.addEventListener('focus', () => show(p));
        el.addEventListener('click', (e) => {
          e.stopPropagation(); // don't let the map's click close it straight away
          show(p);
          pinnedId = p.id;
        });
        return new ml.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m);
      });
      // Fit to your own pins once; never jump around while exploring.
      const own = pins.filter((p) => p.kind !== 'explore');
      if (!fitted.current && own.length > 1) {
        const b = new ml.LngLatBounds();
        for (const p of own) b.extend([p.lng, p.lat]);
        m.fitBounds(b, { padding: 48, maxZoom: 15, duration: 0 });
      }
      if (own.length > 0) fitted.current = true;
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
        picker.current = new ml.Marker({ color: '#b0141b', draggable: true })
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
