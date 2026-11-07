import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

// Card weight follows trust: friend cards are strongest, public cards quietest (UI_UX.md §4.4).
type Tone = 'default' | 'friend' | 'public';

const tones: Record<Tone, string> = {
  default: 'sk-card bg-surface border border-line p-4',
  friend: 'sk-card bg-surface border-2 border-primary/30 p-4',
  public: 'bg-surface/70 border border-line px-3 py-2.5 text-sm',
};

export function Card({
  tone = 'default',
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  // data-reveal: cards rise in as they enter the screen (components/motion/PageMotion).
  return (
    <div
      data-reveal=""
      className={cn('rounded-[var(--radius-card)]', tones[tone], className)}
      {...props}
    />
  );
}
