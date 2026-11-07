import type { ReactNode } from 'react';
import { Sticker, foodFor } from '@/components/brand/Sticker';

/** Empty state: a food sticker, one sentence, one explanation, one action (UI_UX.md §3). */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <section
      data-reveal="pop"
      className="border-line bg-surface/80 relative overflow-hidden rounded-[var(--radius-card)] border border-dashed px-5 py-8 pr-24"
    >
      <Sticker
        name={foodFor(title)}
        size={76}
        tilt={10}
        className="absolute top-4 right-4 opacity-95"
      />
      {icon ? <div className="text-primary mb-3">{icon}</div> : null}
      <h2 className="font-display text-xl font-semibold text-balance">{title}</h2>
      {body ? <p className="text-muted mt-2">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
