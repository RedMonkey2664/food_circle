'use client';

import { useRef, type ReactNode } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DUR, EASE, gsap, useGSAP } from '@/components/motion/gsap';

gsap.registerPlugin(ScrollTrigger);

type Conditions = { ok: boolean; wide: boolean; mouse: boolean };

/**
 * Scroll-driven motion for the marketing page (/welcome). One client leaf; the sections stay
 * server-rendered and are found through class names and data attributes.
 *
 * Every move has a job:
 *  - statement: the argument is told word by word as you scroll (pinned on wider screens)
 *  - reveals / pops: each block arrives as you reach it, so the page reads in order
 *  - circles: the three trust tiers stack up and stay separate, like the product rule
 *  - cities: two rows of city names slide with the scroll to show breadth
 *  - final: the stickers gather round the last call to action
 *
 * By device: phones get reveals and scrubbed fades only (no pinning, no drift); wider screens
 * pin the statement and stack the circles; mouse-and-keyboard screens also drift the hero
 * stickers. Reduced motion: nothing here runs and nothing is hidden.
 */
export function LandingMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();

      mm.add(
        {
          ok: '(prefers-reduced-motion: no-preference)',
          wide: '(min-width: 768px)',
          mouse: '(hover: hover) and (pointer: fine) and (min-width: 1024px)',
        },
        (ctx) => {
          const { ok, wide, mouse } = ctx.conditions as Conditions;
          if (!ok) return;

          // Nav: a shadow once the page has moved.
          ScrollTrigger.create({
            start: 60,
            end: 'max',
            toggleClass: { targets: q('.lp-nav'), className: 'is-stuck' },
          });

          // Hero stickers drift apart at different speeds (mouse screens only).
          const hero = q('.lp-hero')[0];
          if (mouse && hero) {
            q('[data-drift]').forEach((el) => {
              gsap.to(el, {
                y: -Number((el as HTMLElement).dataset.drift) * 260,
                ease: 'none',
                scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
              });
            });
          }

          // Statement: read out as you scroll.
          const statement = q('.lp-statement')[0];
          if (statement) {
            const words = (part: string) => q(`.lp-statement [data-part="${part}"] .lp-w`);
            const strike = q('.lp-statement .lp-strike path');
            const ring = q('.lp-statement .lp-ring path');
            gsap.set(q('.lp-statement .lp-w'), { opacity: 0.14 });
            gsap.set([...strike, ...ring], { strokeDashoffset: 1 });
            gsap
              .timeline({
                defaults: { ease: 'none' },
                scrollTrigger: wide
                  ? { trigger: statement, start: 'top top', end: '+=170%', pin: true, scrub: 0.6 }
                  : { trigger: statement, start: 'top 72%', end: 'bottom 80%', scrub: 0.6 },
              })
              .to(words('a'), { opacity: 1, stagger: 0.1, duration: 0.3 })
              .to(strike, { strokeDashoffset: 0, duration: 0.7 })
              .to(words('a'), { opacity: 0.38, duration: 0.3 })
              .to(words('aEnd'), { opacity: 1, stagger: 0.1, duration: 0.3 }, '<')
              .to(words('b'), { opacity: 1, stagger: 0.1, duration: 0.3 }, '+=0.3')
              .to(ring, { strokeDashoffset: 0, duration: 0.7 })
              .to(words('bEnd'), { opacity: 1, stagger: 0.1, duration: 0.3 })
              .to({}, { duration: 0.5 });
          }

          // Blocks arrive as you reach them.
          const reveals = q('[data-lp-reveal]');
          gsap.set(reveals, { autoAlpha: 0, y: 34 });
          ScrollTrigger.batch(reveals, {
            start: 'top 88%',
            once: true,
            onEnter: (els) =>
              gsap.to(els, {
                autoAlpha: 1,
                y: 0,
                duration: DUR.scene,
                ease: EASE.out,
                stagger: 0.08,
                overwrite: true,
              }),
          });
          const pops = q('[data-lp-pop]');
          gsap.set(pops, { autoAlpha: 0, scale: 0.6, rotate: -14 });
          ScrollTrigger.batch(pops, {
            start: 'top 90%',
            once: true,
            onEnter: (els) =>
              gsap.to(els, {
                autoAlpha: 1,
                scale: 1,
                rotate: 0,
                duration: DUR.enter,
                ease: EASE.spring,
                stagger: 0.07,
                overwrite: true,
              }),
          });

          // Circles: each card settles back a little as the next one slides over it.
          if (wide) {
            const cards = q('.lp-circle');
            cards.forEach((card, i) => {
              const next = cards[i + 1];
              if (!next) return;
              gsap.to(card, {
                scale: 0.94 - (cards.length - 2 - i) * 0.02,
                ease: 'none',
                scrollTrigger: { trigger: next, start: 'top 85%', end: 'top 30%', scrub: true },
              });
            });
          }

          // Cities: the rows slide with the scroll, in opposite directions.
          const cities = q('.lp-cities')[0];
          if (cities) {
            q('.lp-row').forEach((row, i) => {
              gsap.fromTo(
                row,
                { xPercent: i % 2 ? -28 : 0 },
                {
                  xPercent: i % 2 ? 0 : -28,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: cities,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 0.4,
                  },
                },
              );
            });
          }

          // House rules: the ink line draws across before each rule.
          q('.lp-rule').forEach((rule) => {
            gsap.from(rule, {
              clipPath: 'inset(0 100% 0 0)',
              duration: DUR.scene,
              ease: EASE.draw,
              scrollTrigger: { trigger: rule, start: 'top 88%', once: true },
            });
          });

          // Final call: the stickers gather round.
          const final = q('.lp-final')[0];
          if (final) {
            q('.lp-final [data-from]').forEach((el) => {
              const [x = 0, y = 0, r = 0] = ((el as HTMLElement).dataset.from ?? '')
                .split(',')
                .map(Number);
              gsap.from(el, {
                x: wide ? x : x * 0.4,
                y,
                rotate: r,
                autoAlpha: 0,
                ease: 'none',
                scrollTrigger: { trigger: final, start: 'top 92%', end: 'top 30%', scrub: 0.5 },
              });
            });
          }

          // Web fonts change heights; measure again once they are in.
          let alive = true;
          void document.fonts?.ready.then(() => alive && ScrollTrigger.refresh());
          return () => {
            alive = false;
          };
        },
      );
    },
    { scope },
  );

  return <div ref={scope}>{children}</div>;
}
