'use client';

import { useEffect } from 'react';

/**
 * Pointer effects for the sign-in scrapbook (mouse/trackpad only; off for reduced motion):
 *  - --mx/--my (-1..1) drive sticker parallax by depth,
 *  - --px/--py (px) move the halftone spotlight,
 *  - [data-magnet] elements lean toward the cursor.
 * Writes CSS variables once per frame; no React state, no re-renders.
 */
export function LoginFX() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.fc-login');
    if (!root) return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || still) return;

    root.classList.add('fc-fx');
    let frame = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    const paint = () => {
      frame = 0;
      root.style.setProperty('--mx', ((x / window.innerWidth) * 2 - 1).toFixed(3));
      root.style.setProperty('--my', ((y / window.innerHeight) * 2 - 1).toFixed(3));
      root.style.setProperty('--px', `${Math.round(x)}px`);
      root.style.setProperty('--py', `${Math.round(y)}px`);
      // Queried each frame: the button is swapped in after the form streams in.
      for (const m of root.querySelectorAll<HTMLElement>('[data-magnet]')) {
        const r = m.getBoundingClientRect();
        const dx = x - (r.left + r.width / 2);
        const dy = y - (r.top + r.height / 2);
        const near = Math.abs(dx) < r.width / 2 + 60 && Math.abs(dy) < r.height / 2 + 60;
        const cx = Math.max(-10, Math.min(10, dx * 0.06));
        const cy = Math.max(-7, Math.min(7, dy * 0.2));
        m.style.translate = near ? `${cx.toFixed(1)}px ${cy.toFixed(1)}px` : '';
      }
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
      root.classList.remove('fc-fx');
    };
  }, []);
  return null;
}
