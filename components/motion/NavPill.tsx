'use client';

import { useRef } from 'react';
import { cn } from '@/lib/cn';
import { gsap, motionOK, useGSAP } from './gsap';

/**
 * A highlight that glides to the active nav item (the link with aria-current="page") in its
 * parent list, and gives the new icon a small pop. Place it as the first child of a
 * `relative` list whose links sit above it (z-[1]). `fit="icon"` hugs just the icon.
 */
export function NavPill({
  pathname,
  fit = 'link',
  className,
}: {
  pathname: string | null;
  fit?: 'link' | 'icon';
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  useGSAP(
    () => {
      const pill = ref.current;
      const list = pill?.parentElement;
      if (!pill || !list) return;

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
        const padX = fit === 'icon' ? 14 : 0;
        const padY = fit === 'icon' ? 5 : 0;
        const to = {
          x: r.left - box.left - padX,
          y: r.top - box.top - padY,
          width: r.width + padX * 2,
          height: r.height + padY * 2,
          autoAlpha: 1,
        };
        if (!animate || !placed.current || !motionOK()) {
          gsap.set(pill, to);
        } else {
          gsap.to(pill, { ...to, duration: 0.55, ease: 'expo.out' });
          const icon = active.querySelector('svg');
          if (icon) {
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
      return () => window.removeEventListener('resize', onResize);
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
