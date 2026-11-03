'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { setShowcase } from '@/lib/actions/achievements';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';

type Option = { slug: string; name: string; icon: string };

/** Customise your profile: pin up to 3 earned badges (tap order = display order). */
export function ShowcasePicker({ earned, initial }: { earned: Option[]; initial: string[] }) {
  const t = copy.achieve;
  const [picked, setPicked] = useState<string[]>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(slug: string) {
    setMsg(null);
    if (picked.includes(slug)) setPicked(picked.filter((s) => s !== slug));
    else if (picked.length >= 3) setMsg(t.showcaseFull);
    else setPicked([...picked, slug]);
  }

  function save() {
    start(async () => {
      const r = await setShowcase(picked);
      setMsg(r.ok ? t.showcaseSaved : r.message);
    });
  }

  const preview = picked
    .map((s) => earned.find((e) => e.slug === s))
    .filter((e): e is Option => Boolean(e));

  return (
    <section className="border-line bg-surface rounded-[var(--radius-card)] border p-4">
      <h2 className="font-display text-lg font-semibold">{t.showcase}</h2>
      <p className="text-muted text-sm">{t.showcaseHint}</p>
      {earned.length === 0 ? (
        <p className="text-muted mt-3 text-sm">{t.showcaseEmpty}</p>
      ) : (
        <>
          <div
            className="bg-bg mt-3 flex min-h-12 flex-wrap items-center gap-2 rounded-[var(--radius-button)] p-2"
            aria-live="polite"
          >
            {preview.length ? (
              preview.map((b, i) => (
                <span
                  key={b.slug}
                  className="bg-primary-soft text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold"
                >
                  <span aria-hidden>{b.icon}</span>
                  {b.name}
                  <span className="text-muted text-xs">#{i + 1}</span>
                </span>
              ))
            ) : (
              <span className="text-muted text-sm">—</span>
            )}
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {earned.map((b) => {
              const on = picked.includes(b.slug);
              return (
                <li key={b.slug}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(b.slug)}
                    className={cn(
                      'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors duration-150',
                      on ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface',
                    )}
                  >
                    <span aria-hidden>{b.icon}</span>
                    {b.name}
                  </button>
                </li>
              );
            })}
          </ul>
          <Button type="button" className="mt-3" onClick={save} disabled={pending}>
            {pending ? copy.review.saving : t.showcaseSave}
          </Button>
        </>
      )}
      {msg ? (
        <p className="mt-2 text-sm" role="status">
          {msg}
        </p>
      ) : null}
    </section>
  );
}
