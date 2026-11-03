'use client';

import { useEffect, useState } from 'react';
import { verifyVisit, visitFeedback, type VisitFeedback } from '@/lib/actions/competition';
import { copy } from '@/lib/copy';

/**
 * P6-03 + P6-07 on the log success step: "New place! +1. This month: 12. Aarav is 2 ahead
 * of you." or a neutral reason it didn't count, and an optional "I'm here" verification
 * that asks for location only when tapped and never blocks anything.
 */
export function LogFeedback({ visitId, enabled }: { visitId: string; enabled: boolean }) {
  const t = copy.compete;
  const [fb, setFb] = useState<VisitFeedback | null>(null);
  const [verify, setVerify] = useState<'idle' | 'checking' | 'yes' | 'no' | 'unavailable'>('idle');

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    visitFeedback(visitId).then(
      (r) => alive && setFb(r),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [visitId, enabled]);

  function check() {
    if (!('geolocation' in navigator)) return setVerify('unavailable');
    setVerify('checking');
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const r = await verifyVisit({ visitId, lat: p.coords.latitude, lng: p.coords.longitude });
        setVerify(r.ok && r.data.verified ? 'yes' : r.ok ? 'no' : 'unavailable');
      },
      () => setVerify('unavailable'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  if (!enabled) return null;
  const message = fb
    ? fb.reason === 'new_place'
      ? t.feedback.new_place(fb.monthScore) +
        (fb.rivalName && fb.rivalAheadBy ? t.rival(fb.rivalName, fb.rivalAheadBy - 1) : '')
      : t.feedback[fb.reason]
    : null;

  return (
    <div className="mt-3 space-y-2" aria-live="polite">
      {message ? (
        <p
          className={
            fb?.reason === 'new_place'
              ? 'bg-go-soft text-go motion-safe:animate-suggest-in rounded-[var(--radius-button)] px-3 py-2 text-sm font-semibold'
              : 'text-muted text-sm'
          }
        >
          {message}
        </p>
      ) : null}
      {verify === 'yes' ? (
        <p className="text-go text-sm font-semibold">{t.verified}</p>
      ) : verify === 'no' ? (
        <p className="text-muted text-sm">{t.notNear}</p>
      ) : verify === 'unavailable' ? (
        <p className="text-muted text-sm">{t.locationOff}</p>
      ) : (
        <button
          type="button"
          onClick={check}
          disabled={verify === 'checking'}
          className="text-primary min-h-11 text-sm font-semibold"
        >
          {verify === 'checking' ? t.verifying : t.verify}
        </button>
      )}
    </div>
  );
}
