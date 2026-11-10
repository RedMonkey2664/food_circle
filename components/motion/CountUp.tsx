'use client';

import { useRef } from 'react';
import { DUR, EASE, gsap, motionOK, useGSAP } from './gsap';

/**
 * A number that counts up from zero the first time it is seen. The server renders the final
 * value, so it is correct without JavaScript and for reduced motion.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !motionOK() || value <= 0) return;
      const box = { v: 0 };
      const io = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          io.disconnect();
          gsap.to(box, {
            v: value,
            duration: DUR.scene,
            ease: EASE.out,
            onUpdate: () => {
              el.textContent = Math.round(box.v).toLocaleString('en-IN');
            },
          });
        },
        { threshold: 0.6 },
      );
      el.textContent = '0';
      io.observe(el);
      return () => io.disconnect();
    },
    { dependencies: [value] },
  );

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {value.toLocaleString('en-IN')}
    </span>
  );
}
