import { cn } from '@/lib/cn';

const SHAPES = {
  underline: { box: '0 0 200 14', d: 'M3 9c30-6 60-7 96-4s66 4 98-2' },
  circle: {
    box: '0 0 100 100',
    d: 'M54 7C27 3 6 24 8 51c2 26 22 43 47 42 24-1 40-21 38-46C91 23 72 6 44 10',
  },
} as const;

/**
 * Theme animation: RIBBON DRAW. A hand-drawn marker line that draws itself once (CSS
 * .sk-scribble). Decoration only: aria-hidden, ignores taps, and is placed by the caller
 * around or under its subject, never over it. `fade` makes it disappear after a beat
 * (confirmations). Under reduced motion it is simply drawn.
 */
export function Scribble({
  shape,
  color = 'var(--c-primary)',
  width = 3,
  fade = false,
  delayMs = 0,
  className,
}: {
  shape: keyof typeof SHAPES;
  color?: string;
  width?: number;
  fade?: boolean;
  delayMs?: number;
  className?: string;
}) {
  const s = SHAPES[shape];
  return (
    <svg
      aria-hidden
      viewBox={s.box}
      preserveAspectRatio="none"
      className={cn(
        'sk-scribble pointer-events-none absolute overflow-visible',
        fade && 'sk-scribble-fade',
        className,
      )}
      style={delayMs ? ({ '--draw-delay': `${delayMs}ms` } as React.CSSProperties) : undefined}
    >
      <path
        pathLength={1}
        d={s.d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
