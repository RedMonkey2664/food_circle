'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Sticker, type StickerName } from '@/components/brand/Sticker';
import { motionOK, motionTier, savingData } from './tokens';

const MIN_FREE = 96; // px of empty margin needed before anything is shown
const SPOTS = [
  { top: '16vh', tilt: -9, depth: 0.04 },
  { top: '44vh', tilt: 7, depth: 0.08 },
  { top: '70vh', tilt: -5, depth: 0.12 },
] as const;
const MAX_SCROLL = 600; // the drift stops after this much scrolling

/** "" = show nothing; otherwise "<mode>|<free px>". Read from the real layout, never guessed. */
function snapshot(): string {
  if (savingData()) return '';
  const column = document.querySelector('[data-app-column]');
  // clientWidth, not innerWidth: the scrollbar is not free space.
  const width = document.documentElement.clientWidth;
  if (!column || width < 768) return '';
  const free = Math.floor(width - column.getBoundingClientRect().right);
  if (free < MIN_FREE) return '';
  const mode = motionOK() && motionTier() === 'desktop' ? 'drift' : 'static';
  return `${mode}|${free}`;
}

function subscribe(change: () => void) {
  let frame = 0;
  const on = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(change);
  };
  window.addEventListener('resize', on);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', on);
  };
}

/**
 * Theme animation: RAIL COLLAGE. A few stickers in the empty margin beside the page, only when
 * that margin really is empty (measured, and re-measured on resize), so they can never sit on
 * content. Desktop (mouse): they drift a little as you scroll. Tablet and reduced motion: they
 * are just there. Phones and data-saver: nothing is rendered or downloaded.
 */
export function RailCollage({ stickers }: { stickers: readonly StickerName[] }) {
  const state = useSyncExternalStore(subscribe, snapshot, () => '');
  const [mode, freeText] = state.split('|');
  const free = Number(freeText);
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = layer.current;
    if (mode !== 'drift' || !root) return;
    const items = [...root.children] as HTMLElement[];
    let frame = 0;
    const place = () => {
      frame = 0;
      const y = Math.min(window.scrollY, MAX_SCROLL);
      items.forEach((el, i) => {
        el.style.translate = `0 ${(-y * (SPOTS[i]?.depth ?? 0)).toFixed(1)}px`;
      });
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    place();
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', on);
    };
  }, [mode, state]);

  if (!mode) return null;
  const size = Math.min(104, Math.max(64, free - 32));
  return createPortal(
    <div
      ref={layer}
      aria-hidden
      className="pointer-events-none fixed inset-y-0 right-0 z-0"
      style={{ width: free }}
    >
      {stickers.slice(0, SPOTS.length).map((name, i) => (
        <span
          key={name}
          className="absolute will-change-[translate]"
          style={{ top: SPOTS[i]?.top, left: (free - size) / 2 }}
        >
          <span className="sk-pop block" style={{ animationDelay: `${i * 70}ms` }}>
            <Sticker name={name} size={size} tilt={SPOTS[i]?.tilt ?? 0} />
          </span>
        </span>
      ))}
    </div>,
    document.body,
  );
}
