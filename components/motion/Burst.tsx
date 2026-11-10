'use client';

import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { DUR, EASE, gsap, motionOK, useGSAP } from './gsap';

const BITS = ['✦', '★', '●', '✸', '♥'];
const COLORS = ['#b0141b', '#f6b500', '#2e4fae', '#e5487c', '#161412'];

/**
 * Celebration for an unlocked achievement: the card springs in, its icon spins up, and a
 * confetti of paper bits bursts from the icon. `delay` staggers several unlocks.
 */
export function Burst({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const scope = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      const sky = layer.current;
      if (!root || !sky || !motionOK()) return;
      const icon = root.querySelector('[data-burst-icon]');
      const tl = gsap.timeline({ delay });
      tl.from(root, {
        scale: 0.7,
        autoAlpha: 0,
        y: 18,
        duration: DUR.enter,
        ease: EASE.spring,
      });
      if (icon) {
        tl.from(icon, { scale: 0, rotate: -180, duration: DUR.enter, ease: EASE.spring }, '-=0.3');
      }
      const bits = Array.from({ length: 18 }, (_, i) => {
        const b = document.createElement('span');
        b.textContent = BITS[i % BITS.length] ?? '✦';
        b.style.cssText = `position:absolute;left:0;top:0;font-size:${10 + (i % 4) * 3}px;color:${
          COLORS[i % COLORS.length]
        };pointer-events:none;`;
        sky.appendChild(b);
        return b;
      });
      tl.fromTo(
        bits,
        { x: 0, y: 0, scale: 0, opacity: 1 },
        {
          x: () => gsap.utils.random(-130, 130),
          y: () => gsap.utils.random(-110, 40),
          rotate: () => gsap.utils.random(-260, 260),
          scale: () => gsap.utils.random(0.8, 1.5),
          duration: DUR.scene,
          ease: EASE.out,
          stagger: 0.01,
        },
        '-=0.3',
      ).to(bits, { opacity: 0, y: '+=40', duration: DUR.enter, ease: EASE.stamp }, '-=0.35');
      tl.eventCallback('onComplete', () => bits.forEach((b) => b.remove()));
      return () => bits.forEach((b) => b.remove());
    },
    { scope },
  );

  return (
    <div ref={scope} className={cn('relative', className)}>
      <span
        ref={layer}
        aria-hidden
        className="pointer-events-none absolute top-7 left-8 z-10 size-0 overflow-visible"
      />
      {children}
    </div>
  );
}
