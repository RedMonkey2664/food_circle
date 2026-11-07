/* SKOOP service worker (P7-05).
 * - Static build assets: cache-first (they are content-hashed, so they never go stale).
 * - Page navigations: network-first; the last good copy of each page you visited (your diary,
 *   timeline, places) is kept so it can be read offline; otherwise an offline page.
 * - Never caches API routes, auth, server actions or anything that isn't a GET.
 * - Web push: shows the notification and opens the app on tap.
 */
const VERSION = 'fc-v2';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = '/offline';
const MAX_PAGES = 40;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((c) => c.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trimPages() {
  const cache = await caches.open(PAGE_CACHE);
  const keys = await cache.keys();
  for (const req of keys.slice(0, Math.max(0, keys.length - MAX_PAGES))) {
    if (!req.url.endsWith(OFFLINE_URL)) await cache.delete(req);
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;
  // React Server Component / prefetch requests are handled by the router; leave them alone.
  if (req.headers.get('RSC') || req.headers.get('Next-Router-Prefetch')) return;

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icon')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          // Keep a copy of normal (non-redirect) pages for offline reading.
          if (res.ok && res.type === 'basic' && !res.redirected) {
            const cache = await caches.open(PAGE_CACHE);
            await cache.put(req, res.clone());
            trimPages();
          }
          return res;
        } catch {
          const cache = await caches.open(PAGE_CACHE);
          return (await cache.match(req, { ignoreSearch: false })) || (await cache.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
  }
});

self.addEventListener('push', (event) => {
  let data = { title: 'SKOOP', body: '', url: '/', tag: undefined };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    /* plain text or empty payload */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: '/icon/192',
      badge: '/icon/192',
      data: { url: data.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && 'focus' in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
