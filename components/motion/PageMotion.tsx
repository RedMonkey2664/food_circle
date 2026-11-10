'use client';

import { useRef, type ReactNode } from 'react';
import { DUR, EASE, gsap, useGSAP } from './gsap';

/**
 * The app's motion layer (one per page; app/(app)/template.tsx re-mounts it on navigation).
 * Every move is one-off (no loops), and each kind of thing moves in its own way:
 *  - page: eases in; the first <h1> rises out of a clip like a printed headline
 *  - stickers [data-sticker]: slapped on, with a squash and settle
 *  - cards [data-reveal]: dealt in like playing cards (alternating tilt), as they scroll in
 *  - tiles [data-reveal="pop"]: pop up in a ripple
 *  - ink cards [data-reveal="flip"]: flip up from the table
 *  - verdicts [data-stamp] inside a card: stamped down; photos settle in; bars fill up
 * Uses IntersectionObserver (works in scrolling panels), waits until React has hydrated a node
 * before touching it, and does nothing at all for prefers-reduced-motion.
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
          gsap.from(root, { autoAlpha: 0, y: 14, duration: DUR.enter, clearProps: 'all' });
        }

        const watched = new WeakSet<Element>();
        const hydrated = (el: Element) => Object.keys(el).some((k) => k.startsWith('__react'));
        let queue: Element[] = [];
        let frame = 0;
        const timers: number[] = [];
        let dealt = 0;

        const details = (els: Element[], at: number) => {
          const stamps = els.flatMap((el) => [...el.querySelectorAll('[data-stamp]')]);
          if (stamps.length) {
            gsap.fromTo(
              stamps,
              { scale: 2.2, rotate: -14, autoAlpha: 0 },
              {
                scale: 1,
                rotate: 0,
                autoAlpha: 1,
                duration: DUR.enter,
                ease: EASE.spring,
                stagger: 0.06,
                delay: at + DUR.quick,
                transformOrigin: '0% 50%',
                clearProps: 'transform,opacity,visibility',
              },
            );
          }
          const photos = els.flatMap((el) => [
            ...el.querySelectorAll<HTMLElement>('img:not([data-sticker] img)'),
          ]);
          if (photos.length) {
            gsap.fromTo(
              photos,
              { scale: 1.18, autoAlpha: 0 },
              {
                scale: 1,
                autoAlpha: 1,
                duration: DUR.scene,
                ease: EASE.out,
                stagger: 0.06,
                delay: at + DUR.tap,
                clearProps: 'transform,opacity,visibility',
              },
            );
          }
          const bars = els.flatMap((el) => [
            ...el.querySelectorAll<HTMLElement>('[role="progressbar"] > span'),
          ]);
          if (bars.length) {
            gsap.from(bars, {
              scaleX: 0,
              transformOrigin: '0 50%',
              duration: DUR.scene,
              delay: at + DUR.quick,
              ease: EASE.out,
              stagger: 0.06,
              clearProps: 'transform',
            });
          }
        };

        const reveal = (all: Element[]) => {
          const els = all.filter(hydrated);
          const later = all.filter((el) => !hydrated(el));
          if (later.length) timers.push(window.setTimeout(() => reveal(later), 120));
          if (!els.length) return;
          els.forEach((el) => el.setAttribute('data-revealed', ''));
          const kind = (el: Element) => el.getAttribute('data-reveal') || 'deal';
          const deal = els.filter((el) => kind(el) === 'deal');
          const pop = els.filter((el) => kind(el) === 'pop');
          const flip = els.filter((el) => kind(el) === 'flip');
          const done = { clearProps: 'transform,opacity,visibility' };

          if (deal.length) {
            gsap.fromTo(
              deal,
              {
                autoAlpha: 0,
                y: 32,
                x: () => (dealt++ % 2 ? 14 : -14),
                rotate: (i) => (i % 2 ? 2.4 : -2.4),
                scale: 0.97,
              },
              {
                autoAlpha: 1,
                y: 0,
                x: 0,
                rotate: 0,
                scale: 1,
                duration: DUR.enter,
                ease: EASE.out,
                stagger: 0.06,
                ...done,
              },
            );
          }
          if (pop.length) {
            gsap.fromTo(
              pop,
              { autoAlpha: 0, scale: 0.86, y: 18 },
              {
                autoAlpha: 1,
                scale: 1,
                y: 0,
                duration: DUR.enter,
                ease: EASE.spring,
                stagger: { each: 0.06, from: 'start' },
                ...done,
              },
            );
          }
          if (flip.length) {
            gsap.fromTo(
              flip,
              {
                autoAlpha: 0,
                rotateX: -72,
                y: 30,
                transformPerspective: 900,
                transformOrigin: '50% 100%',
              },
              { autoAlpha: 1, rotateX: 0, y: 0, duration: DUR.scene, ease: EASE.out, ...done },
            );
          }
          details(els, 0);
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
          if (!h || h.closest('[data-no-motion], [data-takeover]') || !hydrated(h)) return;
          titled = true;
          gsap.fromTo(
            h,
            { clipPath: 'inset(0 0 100% 0)', yPercent: 40, skewY: 3 },
            {
              clipPath: 'inset(0 0 -20% 0)',
              yPercent: 0,
              skewY: 0,
              duration: DUR.scene,
              clearProps: 'clipPath,transform',
            },
          );
        };

        const stuck = new WeakSet<Element>();
        const stickers = () => {
          root.querySelectorAll<HTMLElement>('[data-sticker]').forEach((s) => {
            if (stuck.has(s) || !hydrated(s)) return;
            stuck.add(s);
            // Slapped on: drops in big and tilted, squashes, then settles at its own tilt.
            gsap
              .timeline({ delay: DUR.quick })
              .fromTo(
                s,
                { autoAlpha: 0, scale: 1.9, y: -40, rotate: '-=28' },
                {
                  autoAlpha: 1,
                  scale: 0.92,
                  y: 0,
                  rotate: '+=28',
                  duration: DUR.quick,
                  ease: EASE.stamp,
                },
              )
              .to(s, { scale: 1, duration: DUR.enter, ease: EASE.spring })
              .set(s, { clearProps: 'opacity,visibility,transform' });
          });
        };

        const scan = () => {
          root.querySelectorAll('[data-reveal]:not([data-revealed])').forEach((el) => {
            if (watched.has(el)) return;
            watched.add(el);
            // The logging takeover is the fast path: its cards are simply there.
            if (el.closest('[data-takeover]')) el.setAttribute('data-revealed', '');
            else io.observe(el);
          });
          headline();
          stickers();
        };

        scan();
        let scanFrame = 0;
        const mo = new MutationObserver(() => {
          if (scanFrame) return;
          scanFrame = requestAnimationFrame(() => {
            scanFrame = 0;
            scan();
          });
        });
        mo.observe(root, { childList: true, subtree: true });
        return () => {
          mo.disconnect();
          io.disconnect();
          if (frame) cancelAnimationFrame(frame);
          if (scanFrame) cancelAnimationFrame(scanFrame);
          timers.forEach((t) => window.clearTimeout(t));
        };
      });
      return () => {
        mm.revert();
        delete root.dataset.motion;
      };
    },
    { scope },
  );

  return <div ref={scope}>{children}</div>;
}
