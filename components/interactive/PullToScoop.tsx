'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { DUR, EASE, gsap, motionOK } from '@/components/motion/gsap';
import { copy } from '@/lib/copy';

// Feel (px). The page follows the finger with growing resistance and never travels past MAX.
const MAX = 160;
const READY = 88; // let go past this to refresh
const HOLD = 78; // where the page waits while the refresh runs
const MIN_HOLD_MS = 450; // the pinch should read, even on a fast refresh
const GIVE_UP_MS = 8000;

// The hand: public/login/hand-point.webp (424 x 393), finger pointing right in the file.
// Turned so the finger points down; the fingertip is the point that touches the page.
const HAND_W = 118;
const HAND_H = (HAND_W * 393) / 424;
const TURN = 84; // degrees clockwise
const TIP = { x: 0.948, y: 0.338 }; // fingertip, as a fraction of the file
const tipOffset = (() => {
  const a = (TURN * Math.PI) / 180;
  const dx = (TIP.x - 0.5) * HAND_W;
  const dy = (TIP.y - 0.5) * HAND_H;
  return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
})();

const IGNORE =
  'input, textarea, select, [contenteditable], [role="dialog"], [aria-modal="true"], .maplibregl-map, [data-no-pull]';

type Stage = 'idle' | 'pulling' | 'holding' | 'leaving';

/** Pulled distance for a finger travel, with rubber-band resistance. */
const rubber = (dy: number) => (dy <= 0 ? 0 : MAX * (1 - Math.exp(-dy / MAX)));

/** True if the touch started inside something that is itself scrolled down. */
function insideScrolled(el: Element | null): boolean {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.scrollTop > 0) return true;
  }
  return false;
}

/** Fold lines in the paper, all running into the fingertip. */
function creasePaths(w: number, h: number, fx: number): string[] {
  const tops = [-0.04, 0.12, 0.27, 0.4, 0.52, 0.64, 0.77, 0.9, 1.04];
  const out = tops.map((t, i) => {
    const ax = t * w;
    const ay = -4;
    // Bow each fold a little toward the vertical through the fingertip, alternating sides.
    const cx = (ax + fx) / 2 + (i % 2 ? 10 : -10);
    const cy = h * 0.55;
    return `M${ax.toFixed(1)} ${ay}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${fx.toFixed(1)} ${h.toFixed(1)}`;
  });
  // Two short side folds.
  out.push(
    `M-4 ${(h * 0.45).toFixed(1)}Q${(fx * 0.5).toFixed(1)} ${(h * 0.8).toFixed(1)} ${fx.toFixed(1)} ${h.toFixed(1)}`,
  );
  out.push(
    `M${(w + 4).toFixed(1)} ${(h * 0.45).toFixed(1)}Q${((w + fx) / 2).toFixed(1)} ${(h * 0.8).toFixed(1)} ${fx.toFixed(1)} ${h.toFixed(1)}`,
  );
  return out;
}

/**
 * Interactive element: PULL TO SCOOP. On touch screens, pull the page down from the very top:
 * the halftone hand from the sign-in collage reaches in and presses its finger into the paper,
 * which creases toward it. Let go past the line and the hand holds the page while the screen
 * refreshes, then flicks it back up. Let go early and the page simply settles back.
 *
 * Decoration stays in the gap the pull opens above the page, so it never covers content.
 * Laptops and desktops: keep scrolling up at the top of the page (trackpad or wheel); it lets
 * go when the scrolling stops. Skipped on maps, dialogs, form fields and the
 * logging takeover. Reduced motion: the page still follows the finger (direct manipulation)
 * but settles back instantly, with no flick.
 */
export function PullToScoop() {
  const t = copy.interactive;
  const router = useRouter();
  const [pending, startRefresh] = useTransition();
  const [armed, setArmed] = useState(false); // the hand image loads on the first pull only
  const [announce, setAnnounce] = useState('');

  const band = useRef<HTMLDivElement>(null);
  const hand = useRef<HTMLDivElement>(null);
  const folds = useRef<SVGGElement>(null);
  const label = useRef<HTMLParagraphElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  const st = useRef({ p: 0, press: 0, lift: 0, fx: 0 });
  const stage = useRef<Stage>('idle');
  const sawPending = useRef(false);
  const heldAt = useRef(0);
  const timers = useRef<number[]>([]);
  const finish = useRef<() => void>(() => undefined);

  // Refresh finished: let the hand flick the page back up.
  useEffect(() => {
    if (pending) {
      sawPending.current = true;
      return;
    }
    if (stage.current === 'holding' && sawPending.current) finish.current();
  }, [pending]);

  useEffect(() => {
    const column = document.querySelector<HTMLElement>('[data-app-column]');
    if (!column) return;
    const root = document.documentElement;
    const before = root.style.overscrollBehaviorY;
    // Our pull replaces the browser's own pull-to-refresh (they would both fire).
    root.style.overscrollBehaviorY = 'contain';

    const s = st.current;
    let startY = 0;
    let startX = 0;
    let tracking = false;
    let decided = false;
    let ready = false;
    // Where the paper opens: the whole width on phones, over the page column on wider screens
    // (so it never covers the side menu).
    let bandLeft = 0;
    let bandW = window.innerWidth;
    const place = () => {
      if (window.innerWidth < 768) {
        bandLeft = 0;
        bandW = window.innerWidth;
      } else {
        const r = column.getBoundingClientRect();
        bandLeft = r.left;
        bandW = r.width;
      }
      if (band.current) {
        band.current.style.left = `${bandLeft}px`;
        band.current.style.width = `${bandW}px`;
      }
      s.fx = bandW / 2;
    };

    const render = () => {
      const p = s.p;
      const shown = Math.max(p, 0);
      column.style.translate = Math.abs(p) > 0.3 ? `0 ${p.toFixed(1)}px` : '';
      const b = band.current;
      const h = hand.current;
      if (b) {
        b.style.height = `${shown.toFixed(1)}px`;
        b.style.visibility = shown > 0.5 ? 'visible' : 'hidden';
      }
      const w = bandW;
      const fx = s.fx || w / 2;
      if (h) {
        const tipY = shown - 3 + s.press - s.lift;
        h.style.transform = `translate(${(fx - tipOffset.x - HAND_W / 2).toFixed(1)}px, ${(
          tipY -
          tipOffset.y -
          HAND_H / 2
        ).toFixed(1)}px) rotate(${TURN}deg)`;
      }
      const strength = Math.min(1, Math.max(0, (shown - 22) / (READY - 22)));
      if (folds.current && svg.current) {
        svg.current.setAttribute('viewBox', `0 0 ${w} ${Math.max(shown, 1).toFixed(1)}`);
        const ds = creasePaths(w, shown, fx);
        const paths = folds.current.children;
        ds.forEach((d, i) => {
          paths[i * 2]?.setAttribute('d', d);
          paths[i * 2 + 1]?.setAttribute('d', d);
        });
        folds.current.style.opacity = strength.toFixed(3);
        // Folds are deepest at the fingertip and fade out into the paper, like pinched cloth.
        const fade = `radial-gradient(${(w * 0.42).toFixed(0)}px ${(shown * 1.15).toFixed(
          0,
        )}px at ${fx.toFixed(0)}px ${shown.toFixed(0)}px, #000 25%, transparent 100%)`;
        svg.current.style.maskImage = fade;
        svg.current.style.webkitMaskImage = fade;
      }
      if (label.current) label.current.style.opacity = Math.min(1, shown / 40).toFixed(3);
    };

    const setLabel = (text: string) => {
      if (label.current) label.current.textContent = text;
    };

    const clearTimers = () => {
      timers.current.forEach((x) => window.clearTimeout(x));
      timers.current = [];
    };

    const settle = () => {
      stage.current = 'idle';
      gsap.killTweensOf(s);
      s.press = 0;
      s.lift = 0;
      s.p = 0;
      render();
    };

    finish.current = () => {
      if (stage.current !== 'holding') return;
      const wait = Math.max(0, MIN_HOLD_MS - (performance.now() - heldAt.current));
      clearTimers();
      timers.current.push(
        window.setTimeout(() => {
          stage.current = 'leaving';
          setAnnounce(t.pullDone);
          if (!motionOK()) return settle();
          gsap.killTweensOf(s);
          // Dig in, flick the page up (it overshoots a touch), and the hand leaves the top.
          gsap
            .timeline({ onUpdate: render, onComplete: settle })
            .to(s, { press: 7, duration: DUR.tap, ease: EASE.out })
            .to(s, { p: -12, press: 0, lift: 70, duration: DUR.quick, ease: EASE.stamp })
            .to(s, { p: 0, lift: 150, duration: DUR.enter, ease: EASE.spring });
        }, wait),
      );
    };

    const begin = () => {
      stage.current = 'holding';
      heldAt.current = performance.now();
      sawPending.current = false;
      setLabel(t.pullRefreshing);
      setAnnounce(t.pullRefreshing);
      if (motionOK()) {
        gsap.killTweensOf(s);
        gsap.to(s, { p: HOLD, press: 0, duration: DUR.quick, ease: EASE.out, onUpdate: render });
      } else {
        s.p = 0;
        render();
      }
      startRefresh(() => router.refresh());
      // If the refresh never reports as pending, or takes far too long, let go anyway.
      timers.current.push(
        window.setTimeout(() => !sawPending.current && finish.current(), 1500),
        window.setTimeout(() => finish.current(), GIVE_UP_MS),
      );
    };

    const onStart = (e: TouchEvent) => {
      tracking = false;
      if (stage.current !== 'idle' || e.touches.length !== 1) return;
      if (window.scrollY > 0 || document.querySelector('[data-takeover]')) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(IGNORE) || insideScrolled(target)) return;
      const touch = e.touches[0];
      if (!touch) return;
      startY = touch.clientY;
      startX = touch.clientX;
      tracking = true;
      decided = false;
      ready = false;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dy = touch.clientY - startY;
      const dx = touch.clientX - startX;
      if (!decided) {
        if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
        // Only a clear downward pull at the very top counts; anything else is a normal scroll.
        if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 0) {
          tracking = false;
          return;
        }
        decided = true;
        startPull(t.pullHint);
      }
      e.preventDefault();
      // The hand leans toward the finger a little.
      s.fx = bandW / 2 + (touch.clientX - (bandLeft + bandW / 2)) * 0.3;
      pullTo(rubber(dy - 8));
    };

    const startPull = (hint: string) => {
      place();
      stage.current = 'pulling';
      ready = false;
      setArmed(true);
      setLabel(hint);
    };

    /** Moves the page to `p` and handles crossing the line. */
    const pullTo = (p: number) => {
      s.p = p;
      const nowReady = s.p >= READY;
      if (nowReady !== ready) {
        ready = nowReady;
        setLabel(ready ? t.pullRelease : tracking ? t.pullHint : t.pullHintWheel);
        if (ready) {
          navigator.vibrate?.(10);
          if (motionOK()) {
            gsap.fromTo(
              s,
              { press: 0 },
              {
                press: 6,
                duration: DUR.tap,
                ease: EASE.out,
                yoyo: true,
                repeat: 1,
                onUpdate: render,
              },
            );
          }
        }
      }
      render();
    };

    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      release();
    };

    const release = () => {
      if (stage.current !== 'pulling') return;
      if (ready) return begin();
      if (!motionOK()) return settle();
      stage.current = 'leaving';
      gsap.killTweensOf(s);
      gsap.to(s, {
        p: 0,
        press: 0,
        duration: DUR.enter,
        ease: EASE.out,
        onUpdate: render,
        onComplete: settle,
      });
    };

    // Laptops and desktops: keep scrolling up (trackpad or wheel) at the top of the page.
    // The pull lets go when the scrolling stops.
    let wheelDist = 0;
    let wheelTimer = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.deltaX * e.deltaX > e.deltaY * e.deltaY) return;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      const pulling = stage.current === 'pulling' && !tracking;
      if (!pulling) {
        if (stage.current !== 'idle' || dy >= 0 || window.scrollY > 0) return;
        if (document.querySelector('[data-takeover]')) return;
        const target = e.target instanceof Element ? e.target : null;
        if (target?.closest(IGNORE) || insideScrolled(target)) return;
        wheelDist = 0;
        startPull(t.pullHintWheel);
      }
      wheelDist = Math.max(0, wheelDist - dy * 0.5);
      pullTo(rubber(wheelDist));
      window.clearTimeout(wheelTimer);
      // Scrolling back down puts the page away; otherwise wait for the scrolling to stop.
      wheelTimer = window.setTimeout(release, wheelDist > 0 ? 220 : 0);
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.clearTimeout(wheelTimer);
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      clearTimers();
      gsap.killTweensOf(s);
      column.style.translate = '';
      root.style.overscrollBehaviorY = before;
      stage.current = 'idle';
    };
  }, [router, t]);

  return (
    <>
      <div
        ref={band}
        aria-hidden
        className="sk-pull pointer-events-none fixed top-0 left-0 z-20 w-full overflow-hidden"
        style={{ height: 0, visibility: 'hidden' }}
      >
        <svg ref={svg} className="absolute inset-0 size-full" preserveAspectRatio="none">
          <g ref={folds} fill="none" strokeLinecap="round" style={{ opacity: 0 }}>
            {Array.from({ length: 11 }, (_, i) => [
              <path key={`s${i}`} stroke="rgb(60 25 5 / 0.16)" strokeWidth="2.4" />,
              <path
                key={`l${i}`}
                stroke="rgb(255 255 255 / 0.75)"
                strokeWidth="1.2"
                transform="translate(1.4 0)"
              />,
            ])}
          </g>
        </svg>
        <p
          ref={label}
          className="font-display text-muted absolute bottom-2.5 left-4 text-sm font-semibold italic"
        />
        {armed ? (
          <div
            ref={hand}
            className="absolute top-0 left-0 drop-shadow-[0_8px_10px_rgb(50_20_5/0.3)]"
            style={{ width: HAND_W, height: HAND_H, transform: 'translate(-999px, -999px)' }}
          >
            <Image
              src="/login/hand-point.webp"
              width={424}
              height={393}
              sizes={`${HAND_W}px`}
              alt=""
              draggable={false}
              priority
              className="h-auto w-full select-none"
            />
          </div>
        ) : null}
      </div>
      <p role="status" className="sr-only">
        {announce}
      </p>
    </>
  );
}
