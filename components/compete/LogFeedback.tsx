'use client';

import { useEffect, useState } from 'react';
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
        <div
          key={u.name}
          className="border-primary/40 bg-primary-soft motion-safe:animate-suggest-in flex items-start gap-3 rounded-[var(--radius-card)] border p-3"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <span aria-hidden className="text-3xl leading-none">
            {u.icon}
          </span>
          <span>
            <span className="text-primary block text-xs font-bold tracking-wide uppercase">
              {t.unlocked}
            </span>
            <span className="font-display block text-lg font-semibold">{u.name}</span>
            <span className="text-muted text-sm">{u.description}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
