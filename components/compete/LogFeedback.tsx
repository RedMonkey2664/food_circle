'use client';

import { useEffect, useState } from 'react';
import { Burst } from '@/components/motion/Burst';
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
          delay={i * 0.35}
          className="border-primary/40 bg-primary-soft flex items-start gap-3 rounded-[var(--radius-card)] border p-3"
        >
          <span aria-hidden data-burst-icon className="inline-block text-3xl leading-none">
            {u.icon}
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
