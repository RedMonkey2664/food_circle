'use client';

import { useEffect, useState } from 'react';
import { Scribble } from '@/components/brand/Scribble';
import { Burst } from '@/components/motion/Burst';
import { DUR } from '@/components/motion/tokens';
import { visitFeedback, type VisitFeedback } from '@/lib/actions/achievements';
import { copy } from '@/lib/copy';

/** After logging: "New place!" and any achievements this visit just unlocked. */
export function LogFeedback({ visitId }: { visitId: string }) {
  const t = copy.achieve;
  const [fb, setFb] = useState<VisitFeedback | null>(null);

  useEffect(() => {
    let alive = true;
    visitFeedback(visitId).then(
      (r) => alive && setFb(r),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [visitId]);

  if (!fb) return null;
  return (
    <div className="mt-3 space-y-2" aria-live="polite">
      <p
        className={
          fb.reason === 'new_place' ? 'text-go text-sm font-semibold' : 'text-muted text-sm'
        }
      >
        {t.feedback[fb.reason]}
      </p>
      {fb.unlocked.map((u, i) => (
        <Burst
          key={u.name}
          delay={i * DUR.quick}
          className="border-primary/40 bg-primary-soft flex items-start gap-3 rounded-[var(--radius-card)] border p-3"
        >
          <span aria-hidden className="relative inline-block shrink-0">
            <span data-burst-icon className="inline-block text-3xl leading-none">
              {u.icon}
            </span>
            <Scribble
              shape="circle"
              width={2.5}
              delayMs={450 + i * 200}
              className="-top-1.5 -left-1.5 size-[calc(100%+0.75rem)]"
            />
          </span>
          <span>
            <span className="text-primary block text-xs font-bold tracking-wide uppercase">
              {t.unlocked}
            </span>
            <span className="font-display block text-lg font-semibold">{u.name}</span>
            <span className="text-muted text-sm">{u.description}</span>
          </span>
        </Burst>
      ))}
    </div>
  );
}
