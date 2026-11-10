'use client';

import { useEffect, useState } from 'react';
import { motionOK } from '@/components/motion/tokens';
import { copy } from '@/lib/copy';

/**
 * Interactive element: BACK TO TOP. Appears after you scroll far down a long list; tap to glide
 * back up. Sits above the phone's bottom nav.
 */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let frame = 0;
    const on = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setShow(window.scrollY > 1100));
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', on);
    };
  }, []);
  return (
    <button
      type="button"
      aria-label={copy.interactive.backToTop}
      onClick={() => window.scrollTo({ top: 0, behavior: motionOK() ? 'smooth' : 'auto' })}
      className={`sk-back-top fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 flex size-12 items-center justify-center rounded-full bg-[#161412] text-xl text-[#f6b500] shadow-[0_10px_24px_-10px_rgb(0_0_0/0.6)] md:bottom-8 ${show ? 'is-on' : ''}`}
      tabIndex={show ? 0 : -1}
    >
      ↑
    </button>
  );
}
