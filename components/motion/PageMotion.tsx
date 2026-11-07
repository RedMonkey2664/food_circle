'use client';

import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP } from './gsap';

/**
 * The app's motion layer (one per page; app/(app)/template.tsx re-mounts it on navigation).
 *  - The page eases in, and its first <h1> rises out of a clip like a printed headline.
 *  - Anything marked [data-reveal] (every Card) rises in, staggered, as it enters the screen,
 *    including content that streams in later (watched with a MutationObserver).
 * Uses IntersectionObserver, so it also works inside scrolling panels. Nothing is hidden
 * unless this layer is running, and nothing animates for prefers-reduced-motion.
 */
export function PageMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        root.dataset.motion = 'on';
        // The log takeover has its own circle reveal; everything else eases in.
        if (!window.location.pathname.startsWith('/log')) {
          gsap.from(root, { autoAlpha: 0, y: 14, duration: 0.5, clearProps: 'all' });
        }

        // Track in memory, not in the DOM: survives React's double-run in dev and never
        // touches markup React has not hydrated yet (that would be a hydration mismatch).
        const watched = new WeakSet<Element>();
        const hydrated = (el: Element) => Object.keys(el).some((k) => k.startsWith('__react'));
        let queue: Element[] = [];
        let frame = 0;
        let retry = 0;
        const reveal = (all: Element[]) => {
          const els = all.filter(hydrated);
          const later = all.filter((el) => !hydrated(el));
          if (later.length) {
            retry = window.setTimeout(() => reveal(later), 120);
          }
          if (!els.length) return;
          els.forEach((el) => el.setAttribute('data-revealed', ''));
          // Progress bars inside a revealed card fill up from empty.
          const bars = els.flatMap((el) => [
            ...el.querySelectorAll<HTMLElement>('[role="progressbar"] > span'),
          ]);
          if (bars.length) {
            gsap.from(bars, {
              scaleX: 0,
              transformOrigin: '0 50%',
              duration: 1.2,
              delay: 0.25,
              ease: 'power3.out',
              stagger: 0.05,
              clearProps: 'transform',
            });
          }
          gsap.fromTo(
            els,
            { autoAlpha: 0, y: 28, scale: 0.985, rotate: () => gsap.utils.random(-1.4, 1.4) },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              rotate: 0,
              duration: 0.8,
              stagger: 0.07,
              clearProps: 'transform,opacity,visibility',
            },
          );
        };
        const io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue;
              io.unobserve(e.target);
              queue.push(e.target);
            }
            if (queue.length && !frame) {
              frame = requestAnimationFrame(() => {
                frame = 0;
                const batch = queue;
                queue = [];
                reveal(batch);
              });
            }
          },
          { rootMargin: '0px 0px -6% 0px' },
        );

        let titled = false;
        const headline = () => {
          if (titled) return;
          const h = root.querySelector<HTMLElement>('h1');
          if (!h || h.closest('[data-no-motion]') || !hydrated(h)) return;
          titled = true;
          gsap.fromTo(
            h,
            { clipPath: 'inset(0 0 100% 0)', yPercent: 40, skewY: 3 },
            {
              clipPath: 'inset(0 0 -20% 0)',
              yPercent: 0,
              skewY: 0,
              duration: 0.9,
              clearProps: 'clipPath,transform',
            },
          );
        };
        const scan = () => {
          root.querySelectorAll('[data-reveal]:not([data-revealed])').forEach((el) => {
            if (watched.has(el)) return;
            watched.add(el);
            io.observe(el);
          });
          headline();
        };

        scan();
        const mo = new MutationObserver(scan);
        mo.observe(root, { childList: true, subtree: true });
        return () => {
          mo.disconnect();
          io.disconnect();
          if (frame) cancelAnimationFrame(frame);
          window.clearTimeout(retry);
          delete root.dataset.motion;
        };
      });
      return () => mm.revert();
    },
    { scope },
  );

  return <div ref={scope}>{children}</div>;
}
