'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker in production. On the sign-in page (i.e. after signing out)
 * it deletes the offline page copies, so a shared phone never shows the last person's diary.
 */
export function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    if (window.location.pathname === '/login' && 'caches' in window) {
      void caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((k) => k.endsWith('-pages')).map((k) => caches.delete(k))),
        );
    }
    const onLoad = () =>
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    return () => window.removeEventListener('load', onLoad);
  }, []);
  return null;
}
