'use client';

import { useEffect, useState } from 'react';

const EVENT = 'skoop:toast';
type Toast = { id: number; text: string };

/** Show a short confirmation at the bottom of the screen ("Saved to Want to go ★"). */
export function toast(text: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: text }));
}

/**
 * Interactive element: TOAST. One per app (mounted in the app layout). Pops up above the bottom
 * nav, stays 2.4 s, tap to dismiss early. Announced to screen readers.
 */
export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs.slice(-2), { id, text: String((e as CustomEvent).detail) }]);
      window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2400);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-8"
    >
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}
          className="sk-toast pointer-events-auto rounded-full bg-[#161412] px-4 py-2.5 text-sm font-semibold text-[#fbf3e6] shadow-[0_12px_28px_-12px_rgb(0_0_0/0.6)]"
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}
