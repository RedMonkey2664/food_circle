'use client';

import { useRef, useState, type ReactNode } from 'react';
import { copy } from '@/lib/copy';

/**
 * Interactive element: TAP STICKER. Tap a page's sticker: it spins with a wobble and says a
 * one-liner in a speech bubble (copy.interactive.quips, per sticker).
 */
export function TapSticker({ name, children }: { name: string; children: ReactNode }) {
  const quips = copy.interactive.quips[name] ?? copy.interactive.quips.default ?? [];
  const [say, setSay] = useState<string | null>(null);
  const [spin, setSpin] = useState(0);
  const n = useRef(0);
  const timer = useRef(0);

  function tap() {
    setSpin((s) => s + 1);
    setSay(quips[n.current++ % Math.max(quips.length, 1)] ?? null);
    navigator.vibrate?.(8);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSay(null), 2200);
  }

  return (
    <span className="relative inline-block shrink-0">
      <button
        type="button"
        onClick={tap}
        aria-label={say ?? 'Sticker'}
        className="block cursor-pointer touch-manipulation"
      >
        <span key={spin} className={spin ? 'sk-sticker-spin block' : 'block'}>
          {children}
        </span>
      </button>
      {say ? (
        <span
          role="status"
          className="sk-bubble absolute top-1 right-[calc(100%+6px)] z-20 w-max max-w-[11rem] rounded-2xl rounded-tr-sm bg-[#161412] px-3 py-2 text-xs font-semibold text-[#fbf3e6] shadow-lg"
        >
          {say}
        </span>
      ) : null}
    </span>
  );
}
