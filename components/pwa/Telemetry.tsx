'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { reportError, track } from '@/lib/analytics';

/**
 * P7-07: one anonymous page_view per navigation (route pattern only) and uncaught errors.
 * Must sit inside <Suspense> (reads the URL). Production only.
 */
export function Telemetry() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    track('page_view');
  }, [pathname]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    const onError = (e: ErrorEvent) => reportError(e.message || 'Script error');
    const onRejection = (e: PromiseRejectionEvent) =>
      reportError(e.reason instanceof Error ? e.reason.message : 'Unhandled rejection');
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
