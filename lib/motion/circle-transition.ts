'use client';

/**
 * Circular reveal between routes, using the browser's View Transitions API.
 *
 * open:  the NEXT page grows out of the tapped element as a circle (fast, then settles).
 * close: the CURRENT page shrinks back into the point it was opened from.
 *
 * The browser snapshots the old screen, we navigate, and CSS (app/globals.css, "Circle
 * reveal") animates a clip-path circle on the snapshot. Nothing extra lives in the DOM, so
 * there is no layout shift, no stacking or scroll-lock work, and the page stays fully
 * interactive afterwards. Without browser support, or with reduced motion, navigation simply
 * happens instantly.
 */

type Point = { x: number; y: number };
type Navigate = () => void;

/** Resolves the pending transition once the new route has rendered (see RouteSettled). */
let settle: (() => void) | null = null;
let active: ViewTransition | null = null;
let activeMode: 'open' | 'close' | null = null;
/** Where the takeover was opened from, and the page to return to on close. */
let origin: Point | null = null;
let returnTo: string | null = null;

/** Longest a transition may wait for the next route before it reveals whatever is there. */
const SETTLE_TIMEOUT_MS = 1500;

export function notifyRouteSettled(): void {
  const resolve = settle;
  settle = null;
  resolve?.();
}

function canAnimate(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function centerOf(el: Element): Point {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Radius that covers the whole viewport from the point (distance to the farthest corner). */
function coverRadius(p: Point): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return Math.ceil(Math.hypot(Math.max(p.x, w - p.x), Math.max(p.y, h - p.y)));
}

/** Path + query of a href, resolved against the current page. */
function pathOf(href: string): string {
  const u = new URL(href, window.location.href);
  return `${u.pathname}${u.search}`;
}

function run(mode: 'open' | 'close', at: Point, target: string, navigate: Navigate): void {
  const alreadyThere = pathOf(target) === `${window.location.pathname}${window.location.search}`;
  if (!canAnimate() || alreadyThere) {
    // No URL change means no "route settled" signal, so never wrap it in a transition.
    navigate();
    return;
  }
  // Double-tapping the trigger: the first open is already on its way; ignore the rest.
  if (active && mode === 'open' && activeMode === 'open') return;
  // Closing mid-open (or any overlap): finish the running transition instantly, start fresh.
  active?.skipTransition();
  notifyRouteSettled();

  const root = document.documentElement;
  root.style.setProperty('--vt-x', `${at.x}px`);
  root.style.setProperty('--vt-y', `${at.y}px`);
  root.style.setProperty('--vt-r', `${coverRadius(at)}px`);
  root.dataset.vt = mode;

  const transition = document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        settle = resolve;
        navigate();
        window.setTimeout(() => {
          if (settle === resolve) notifyRouteSettled();
        }, SETTLE_TIMEOUT_MS);
      }),
  );
  active = transition;
  activeMode = mode;
  const cleanup = () => {
    if (active !== transition) return; // a newer transition owns the attributes now
    active = null;
    activeMode = null;
    delete root.dataset.vt;
  };
  transition.finished.then(cleanup, cleanup);
}

/** Open a takeover route (e.g. /log), growing it out of `from`. */
export function openWithCircle(
  href: string,
  navigate: Navigate,
  from: Element,
  currentPath: string,
): void {
  if (active && activeMode === 'open') return; // keep the first tap's origin and return path
  origin = centerOf(from);
  returnTo = currentPath;
  run('open', origin, href, navigate);
}

/**
 * Close the takeover: shrink back into where it opened, then show `href` (or the page it was
 * opened from, or `fallbackHref` after a reload). `from` is used when the origin is unknown.
 */
export function closeWithCircle(
  push: (href: string) => void,
  from: Element,
  opts: { href?: string; fallbackHref?: string } = {},
): void {
  const at = origin ?? centerOf(from);
  const target = opts.href ?? returnTo ?? opts.fallbackHref ?? '/';
  origin = null;
  returnTo = null;
  run('close', at, target, () => push(target));
}
