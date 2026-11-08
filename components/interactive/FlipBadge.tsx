'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Interactive element: FLIP BADGE. Tap an achievement tile to flip it over and see its back
 * (progress, or when you unlocked it). Taps on links/buttons inside the front still work.
 */
export function FlipBadge({
  front,
  back,
  className,
  label,
}: {
  front: ReactNode;
  back: ReactNode;
  className?: string;
  label: string;
}) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={label}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a, button')) return;
        setFlipped((f) => !f);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
      className={cn('sk-flip cursor-pointer [perspective:900px]', className)}
    >
      <div className={cn('sk-flip-inner relative h-full', flipped && 'is-flipped')}>
        <div className="sk-flip-face h-full">{front}</div>
        <div className="sk-flip-face sk-flip-back absolute inset-0">{back}</div>
      </div>
    </div>
  );
}
