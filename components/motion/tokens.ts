// SKOOP motion tokens: the only eases and durations the app uses. The same values exist as CSS
// variables in app/globals.css (--ease-*, --dur-*); change both together.
// (The circle reveal in lib/motion/circle-transition.ts keeps its own tuned --vt-* timings.)

/** GSAP ease names. */
export const EASE = {
  /** Default: fast start, soft landing. Entrances, glides, fills. */
  out: 'power4.out',
  /** A small overshoot: pops, toasts, chips, anything "stuck on". */
  spring: 'back.out(1.7)',
  /** Accelerates into the page: stamps and slaps coming down, things falling away. */
  stamp: 'power3.in',
  /** Even pen speed: marker underlines and ribbons drawing themselves. */
  draw: 'power3.inOut',
} as const;

/** The same curves for the Web Animations API and inline styles. */
export const CSS_EASE = {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  stamp: 'cubic-bezier(0.32, 0, 0.67, 0)',
  draw: 'cubic-bezier(0.65, 0, 0.35, 1)',
} as const;

/** Durations in seconds (GSAP). */
export const DUR = {
  /** Press feedback. */
  tap: 0.12,
  /** Small state changes: colour, fade, anything inside the logging flow. */
  quick: 0.2,
  /** One element arriving: a card, a toast, a pop. */
  enter: 0.45,
  /** A set piece: flips, photo settles, confetti, drawn lines. */
  scene: 0.8,
} as const;

/** Durations in milliseconds (Web Animations API, timers). */
export const DUR_MS = {
  tap: DUR.tap * 1000,
  quick: DUR.quick * 1000,
  enter: DUR.enter * 1000,
  scene: DUR.scene * 1000,
} as const;

/** True when the visitor has not asked for reduced motion. */
export function motionOK(): boolean {
  return (
    typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Which motion treatment this device gets. Decided from how it is used (touch or mouse), not
 * only from its width: a small laptop window is still "desktop", a wide touch screen is not.
 *  - still:   reduced motion; show the finished state, animate nothing
 *  - phone:   touch, narrow; fewest layers, small corner-anchored decoration
 *  - tablet:  touch or narrow mouse window with the side rail; a little richer
 *  - desktop: mouse/trackpad with hover and room; hover details and the fullest scenes
 */
export type MotionTier = 'still' | 'phone' | 'tablet' | 'desktop';

export function motionTier(): MotionTier {
  if (!motionOK()) return 'still';
  const mouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const width = window.innerWidth;
  if (mouse && width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'phone';
}

/** True when the browser reports data-saver, so optional decoration can be skipped. */
export function savingData(): boolean {
  if (typeof navigator === 'undefined') return false;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return c?.saveData === true;
}
