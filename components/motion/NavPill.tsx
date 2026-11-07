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

      const place = (animate: boolean) => {
        const active = list.querySelector<HTMLElement>('[aria-current="page"]');
        if (!active) {
          gsap.to(pill, { autoAlpha: 0, duration: 0.2 });
          placed.current = false;
          return;
        }
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
          // A little stretch while it travels, like ink being dragged.
          gsap.to(pill, { ...to, autoAlpha: 1, duration: 0.6, ease: 'expo.out' });
          if (fit !== 'link') {
            gsap.fromTo(
              pill,
              { scaleY: fit === 'underline' ? 1.8 : 0.85 },
              { scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)', clearProps: 'scale' },
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

      place(true);
      const onResize = () => place(false);
      window.addEventListener('resize', onResize);
      const mo = new MutationObserver(() => place(true));
      mo.observe(list, { attributes: true, attributeFilter: ['aria-current'], subtree: true });
      return () => {
        window.removeEventListener('resize', onResize);
        mo.disconnect();
      };
    },
    { dependencies: [pathname, fit] },
  );

  return (
    <span
      ref={ref}
      aria-hidden
      className={cn('pointer-events-none absolute top-0 left-0 opacity-0', className)}
    />
  );
}
