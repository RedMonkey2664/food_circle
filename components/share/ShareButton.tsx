'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { createShareCard } from '@/lib/actions/share';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';

type Target = { kind: 'recap'; ref: string } | { kind: 'badge'; ref: string } | { kind: 'journey' };

/**
 * P7-04: creates a public share link only when tapped (the snapshot holds counts and names of
 * badges, never notes, photos or your visit list), then offers WhatsApp, the share sheet,
 * copy, and a 9:16 story image.
 */
export function ShareButton({
  target,
  label,
  text,
  compact = false,
}: {
  target: Target;
  label?: string;
  text: string;
  compact?: boolean;
}) {
  const t = copy.share;
  const [links, setLinks] = useState<{ url: string; storyUrl: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function create() {
    setMsg(null);
    start(async () => {
      const r = await createShareCard(target);
      if (!r.ok) return setMsg(r.message);
      setLinks(r.data);
      track('share_created');
    });
  }

  async function nativeShare(url: string) {
    try {
      await navigator.share({ title: text, text, url });
    } catch {
      // cancelled
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMsg(t.copied);
    } catch {
      setMsg(t.copyFailed);
    }
  }

  if (!links) {
    return (
      <span className="inline-flex flex-col">
        <button
          type="button"
          onClick={create}
          disabled={pending}
          className={cn(
            'text-primary inline-flex items-center gap-1.5 font-semibold',
            compact ? 'min-h-9 text-xs' : 'min-h-11 text-sm',
          )}
        >
          <span aria-hidden>↗</span>
          {pending ? t.creating : (label ?? t.share)}
        </button>
        {msg ? (
          <span role="alert" className="text-skip text-xs">
            {msg}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <div className="border-line bg-surface mt-2 w-full rounded-[var(--radius-card)] border p-3">
      <p className="text-muted text-xs">{t.publicNote}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${links.url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[#1f8f4d] text-sm font-semibold text-white"
        >
          {t.whatsapp}
        </a>
        <a
          href={links.storyUrl}
          target="_blank"
          rel="noopener noreferrer"
          download="food-circle-story.png"
          className="border-line flex min-h-11 items-center justify-center rounded-[var(--radius-button)] border text-sm font-semibold"
        >
          {t.story}
        </a>
        {'share' in navigator ? (
          <Button variant="secondary" onClick={() => nativeShare(links.url)}>
            {t.more}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={() => copyLink(links.url)}>
          {t.copy}
        </Button>
      </div>
      {msg ? (
        <p className="mt-2 text-xs" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
