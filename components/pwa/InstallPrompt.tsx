'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { track } from '@/lib/analytics';
import { copy } from '@/lib/copy';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * "Install app": Android/desktop Chrome get the real install prompt; iPhone/iPad Safari (no
 * prompt API) get the two-step Share > Add to Home Screen hint. Hidden once installed.
 */
export function InstallPrompt() {
  const t = copy.pwa;
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<'hidden' | 'prompt' | 'ios'>('hidden');

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    if (ios) queueMicrotask(() => setMode('ios'));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setMode('prompt');
    };
    const onInstalled = () => setMode('hidden');
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (mode === 'hidden') return null;
  return (
    <section className="border-line bg-surface rounded-[var(--radius-card)] border p-4">
      <h2 className="font-semibold">{t.installTitle}</h2>
      <p className="text-muted mt-1 text-sm">{mode === 'ios' ? t.installIos : t.installBody}</p>
      {mode === 'prompt' && evt ? (
        <Button
          className="mt-3"
          onClick={async () => {
            await evt.prompt();
            const { outcome } = await evt.userChoice;
            track(outcome === 'accepted' ? 'install_accepted' : 'install_dismissed');
            setEvt(null);
            setMode('hidden');
          }}
        >
          {t.install}
        </Button>
      ) : null}
    </section>
  );
}
