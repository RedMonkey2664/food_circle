import type { ReactNode } from 'react';

/** Illustration-free empty state: one sentence, one explanation, one action (UI_UX.md §3). */
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
    <section className="border-line bg-surface rounded-[var(--radius-card)] border border-dashed px-5 py-8">
      {icon ? <div className="text-primary mb-3">{icon}</div> : null}
      <h2 className="font-display text-xl font-semibold text-balance">{title}</h2>
      {body ? <p className="text-muted mt-2">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
