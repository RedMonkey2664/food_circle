'use client';

import { useRef, useState, type ReactNode } from 'react';
import { setWantToGo } from '@/lib/actions/places';
import { copy } from '@/lib/copy';
import { toast } from './Toast';

/**
 * Interactive element: DOUBLE-TAP SAVE. Double-tap (or double-click) a verdict card to save the
 * place to Want to go: a star pops where you tapped and a toast confirms. Taps on links and
 * buttons inside the card still work normally.
 */
export function DoubleTapSave({
  placeId,
  fromVisit,
  children,
}: {
  /** No place (cards on a place's own page): double-tap does nothing. */
  placeId?: string;
  fromVisit?: string;
  children: ReactNode;
}) {
  const last = useRef(0);
  const [stars, setStars] = useState<{ id: number; x: number; y: number }[]>([]);

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!placeId) return;
    if ((e.target as HTMLElement).closest('a, button, input, textarea, select, summary')) return;
    const now = e.timeStamp;
    if (now - last.current > 320) {
      last.current = now;
      return;
    }
    last.current = 0;
    const box = e.currentTarget.getBoundingClientRect();
    const id = now;
    setStars((s) => [...s, { id, x: e.clientX - box.left, y: e.clientY - box.top }]);
    window.setTimeout(() => setStars((s) => s.filter((x) => x.id !== id)), 900);
    navigator.vibrate?.(12);
    void setWantToGo({ placeId, save: true, fromVisit }).then((r) =>
      toast(r.ok ? copy.interactive.savedToast : copy.interactive.saveFailed),
    );
  }

  return (
    <div className="relative touch-manipulation select-none" onPointerUp={onPointerUp}>
      {children}
      {stars.map((s) => (
        <span
          key={s.id}
          aria-hidden
          className="sk-star-pop pointer-events-none absolute z-10 text-5xl text-[#f6b500] drop-shadow-[0_4px_6px_rgb(0_0_0/0.25)]"
          style={{ left: s.x, top: s.y }}
        >
          ★
        </span>
      ))}
    </div>
  );
}
