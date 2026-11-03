'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { createInvite } from '@/lib/actions/social';
import { copy } from '@/lib/copy';

type Props = {
  siteUrl: string;
  existing: { code: string; expiresAt: string } | null;
  /** Group mode: invite to this group instead of a plain friend invite. */
  group?: { id: string; name: string };
};

function inviteUrl(siteUrl: string, code: string) {
  return `${siteUrl.replace(/\/$/, '')}/invite/${code}`;
}

/**
 * Invite link block: create a link, share on WhatsApp (wa.me with prefilled text) or the
 * Web Share sheet, or copy it. Links expire after 7 days and work for up to 20 people.
 */
export function InviteBlock({ siteUrl, existing, group }: Props) {
  const [link, setLink] = useState(existing ? inviteUrl(siteUrl, existing.code) : null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const t = copy.invite;

  function create() {
    setError(null);
    startTransition(async () => {
      const r = await createInvite(group?.id);
      if (r.ok) setLink(inviteUrl(siteUrl, r.data.code));
      else setError(r.message);
    });
  }

  async function share() {
    if (!link) return;
    const text = group ? copy.groups.inviteShare(group.name, link) : t.shareText(link);
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // cancelled or unsupported: fall through to WhatsApp
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t.copyFailed);
    }
  }

  return (
    <section className="border-line bg-surface rounded-[var(--radius-card)] border p-4">
      <h2 className="font-display text-lg font-semibold">
        {group ? copy.groups.inviteTitle : t.title}
      </h2>
      <p className="text-muted mt-1 text-sm">{group ? copy.groups.inviteBody : t.body}</p>
      {link ? (
        <>
          <p
            className="bg-bg mt-3 truncate rounded-[var(--radius-button)] px-3 py-2 font-mono text-sm"
            title={link}
          >
            {link}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={share}>
              {t.whatsapp}
            </Button>
            <Button variant="secondary" onClick={copyLink} aria-live="polite">
              {copied ? t.copied : t.copy}
            </Button>
          </div>
          <p className="text-muted mt-2 text-xs">{t.limits}</p>
        </>
      ) : (
        <Button className="mt-3" fullWidth onClick={create} disabled={pending}>
          {pending ? t.creating : t.create}
        </Button>
      )}
      {error ? (
        <p role="alert" className="text-skip mt-2 text-sm">
          {error}
        </p>
      ) : null}
    </section>
  );
}
