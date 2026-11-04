'use client';

import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import {
  removePushSubscription,
  savePushSubscription,
  setFriendVerdictNotifications,
} from '@/lib/actions/push';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * P7-05: notifications are asked for only when you tap "Turn on". Friend requests and
 * companion tags come once on; new verdicts from friends are a separate opt-in.
 */
export function NotificationsCard({
  publicKey,
  friendVerdicts,
}: {
  publicKey: string;
  friendVerdicts: boolean;
}) {
  const t = copy.pwa;
  const [state, setState] = useState<'unsupported' | 'off' | 'on' | 'blocked'>('off');
  const [verdicts, setVerdicts] = useState(friendVerdicts);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      queueMicrotask(() => setState('unsupported'));
      return;
    }
    if (Notification.permission === 'denied') {
      queueMicrotask(() => setState('blocked'));
      return;
    }
    void navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? 'on' : 'off');
    });
  }, []);

  function turnOn() {
    setMsg(null);
    start(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setState(permission === 'denied' ? 'blocked' : 'off');
          return;
        }
        const reg =
          (await navigator.serviceWorker.getRegistration()) ??
          (await navigator.serviceWorker.register('/sw.js'));
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        const r = await savePushSubscription(sub.toJSON());
        if (!r.ok) throw new Error(r.message);
        setState('on');
        track('push_enabled');
      } catch {
        setMsg(t.pushFailed);
      }
    });
  }

  function turnOff() {
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState('off');
    });
  }

  function toggleVerdicts() {
    const next = !verdicts;
    setVerdicts(next);
    start(async () => {
      const r = await setFriendVerdictNotifications(next);
      if (!r.ok) setVerdicts(!next);
    });
  }

  return (
    <section className="border-line bg-surface rounded-[var(--radius-card)] border p-4">
      <h2 className="font-semibold">{t.notifyTitle}</h2>
      <p className="text-muted mt-1 text-sm">
        {state === 'unsupported'
          ? t.notifyUnsupported
          : state === 'blocked'
            ? t.notifyBlocked
            : t.notifyBody}
      </p>
      {state === 'off' ? (
        <Button className="mt-3" onClick={turnOn} disabled={pending}>
          {t.notifyOn}
        </Button>
      ) : state === 'on' ? (
        <div className="mt-3 space-y-3">
          <label className="flex items-start justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold">{t.friendVerdicts}</span>
              <span className="text-muted text-xs">{t.friendVerdictsHint}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={verdicts}
              onClick={toggleVerdicts}
              disabled={pending}
              className={cn(
                'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150',
                verdicts ? 'bg-primary' : 'bg-line',
              )}
            >
              <span className="sr-only">{t.friendVerdicts}</span>
              <span
                className={cn(
                  'inline-block size-5 rounded-full bg-white shadow transition-transform duration-150',
                  verdicts ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </label>
          <button
            type="button"
            onClick={turnOff}
            disabled={pending}
            className="text-muted min-h-11 text-sm font-semibold"
          >
            {t.notifyOff}
          </button>
        </div>
      ) : null}
      {msg ? (
        <p role="alert" className="text-skip mt-2 text-sm">
          {msg}
        </p>
      ) : null}
    </section>
  );
}
