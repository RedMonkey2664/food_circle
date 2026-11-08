'use client';

import { useRef } from 'react';
import { cn } from '@/lib/cn';
import { gsap, motionOK, useGSAP } from './gsap';

type Box = { x: number; y: number; width: number; height: number };
// Last spot per bar, so a highlight still glides when navigation re-creates the bar.
const lastSpot = new Map<string, Box>();

/**
 * A highlight that glides to the active item (the link with aria-current="page") in its
 * parent list. Place it as the first child of a `relative` list whose links sit above it
 * (z-[1]). It follows aria-current changes itself, so tab bars rendered on the server work.
 *  - fit="link": fills the active link (side menu)
 *  - fit="icon": a soft blob behind the icon, with an icon pop (bottom bar)
 *  - fit="underline": a 3px bar under the active tab
 */
export function NavPill({
  pathname,
  fit = 'link',
  className,
}: {
  pathname?: string | null;
  fit?: 'link' | 'icon' | 'underline';
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  useGSAP(
    () => {
      const pill = ref.current;
      const list = pill?.parentElement;
      if (!pill || !list) return;
      const key = `${fit}:${list.getAttribute('aria-label') ?? ''}`;
      // Each run starts from scratch (revertOnUpdate wiped the old styles); the last spot below
      // lets the highlight glide from where it was.
      placed.current = false;

      const place = (animate: boolean) => {
        const active = list.querySelector<HTMLElement>('[aria-current="page"]');
        if (!active) {
          gsap.to(pill, { autoAlpha: 0, duration: 0.2 });
          placed.current = false;
          return;
        }
        // Measure icons at rest: a pop still in flight (shrunk, rotated) would skew the target.
        const icons = list.querySelectorAll('svg');
        gsap.killTweensOf(icons);
        gsap.set(icons, { clearProps: 'transform' });
        const target = fit === 'icon' ? (active.querySelector('svg') ?? active) : active;
        const r = target.getBoundingClientRect();
        const box = list.getBoundingClientRect();
        const left = r.left - box.left + list.scrollLeft;
        const top = r.top - box.top + list.scrollTop;
        const to: Box =
          fit === 'underline'
            ? { x: left + 14, y: top + r.height - 3, width: Math.max(r.width - 28, 16), height: 3 }
            : fit === 'icon'
              ? { x: left - 14, y: top - 5, width: r.width + 28, height: r.height + 10 }
              : { x: left, y: top, width: r.width, height: r.height };
        const prev = lastSpot.get(key);
        lastSpot.set(key, to);
        const moved = !prev || Math.abs(prev.x - to.x) > 1 || Math.abs(prev.y - to.y) > 1;
        if (!moved) animate = false;
        if (!placed.current && animate && prev && motionOK()) {
          gsap.set(pill, { ...prev, autoAlpha: 1 });
          placed.current = true;
        }
        if (!animate || !placed.current || !motionOK()) {
          gsap.set(pill, { ...to, autoAlpha: 1 });
        } else {
          // A little stretch while it travels, like ink being dragged. (No clearProps here:
          // clearing any transform part also wipes x/y and the bar would jump to the corner.)
          gsap.to(pill, { ...to, autoAlpha: 1, duration: 0.6, ease: 'expo.out' });
          if (fit !== 'link') {
            gsap.fromTo(
              pill,
              { scaleY: fit === 'underline' ? 1.8 : 0.85 },
              { scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' },
            );
          }
          const icon = active.querySelector('svg');
          if (icon && fit !== 'underline') {
            gsap.fromTo(
              icon,
              { scale: 0.6, rotate: -14 },
              {
                scale: 1,
                rotate: 0,
                duration: 0.6,
                ease: 'back.out(2.6)',
                clearProps: 'transform',
              },
            );
          }
        }
        placed.current = true;
      };

      // Route changes arrive twice (the pathname prop and the aria-current attribute):
      // coalesce them into one placement per frame.
      let frame = 0;
      const schedule = (animate: boolean) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => place(animate));
      };
      place(true);
      const onResize = () => schedule(false);
      window.addEventListener('resize', onResize);
      const mo = new MutationObserver(() => schedule(true));
      mo.observe(list, { attributes: true, attributeFilter: ['aria-current'], subtree: true });
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', onResize);
        mo.disconnect();
      };
    },
    // revertOnUpdate: each route change tears down the previous watchers before re-placing.
    { dependencies: [pathname, fit], revertOnUpdate: true },
  );

  return (
    <span
      ref={ref}
      aria-hidden
      className={cn('pointer-events-none absolute top-0 left-0 opacity-0', className)}
    />
  );
}
