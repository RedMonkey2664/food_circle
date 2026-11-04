// Privacy-respecting analytics and error reporting (P7-07). Client-side helper.
// Sends only: an event name, the route *pattern* (ids and usernames stripped) and a device
// class. Never a user id, note, photo, place, search text or location.

/** "/place/6f0c…" -> "/place/[id]", "/u/riya" -> "/u/[user]", query strings dropped. */
export function routePattern(pathname: string): string {
  return (pathname.split('?')[0] ?? '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]')
    .replace(/^\/u\/[^/]+/, '/u/[user]')
    .replace(/^\/invite\/[^/]+/, '/invite/[code]')
    .replace(/^\/s\/[^/]+/, '/s/[token]')
    .slice(0, 80);
}

export function deviceClass(width: number): 'phone' | 'tablet' | 'desktop' {
  return width < 768 ? 'phone' : width < 1024 ? 'tablet' : 'desktop';
}

function send(body: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify(body);
    if (!navigator.sendBeacon?.('/api/t', new Blob([payload], { type: 'application/json' }))) {
      void fetch('/api/t', {
        method: 'POST',
        body: payload,
        keepalive: true,
        headers: { 'content-type': 'application/json' },
      });
    }
  } catch {
    // analytics must never break the app
  }
}

export function track(name: string): void {
  if (typeof window === 'undefined') return;
  send({
    type: 'event',
    name,
    route: routePattern(window.location.pathname),
    device: deviceClass(window.innerWidth),
  });
}

export function reportError(message: string, digest?: string): void {
  if (typeof window === 'undefined') return;
  send({
    type: 'error',
    message: message.slice(0, 300),
    ...(digest ? { digest: digest.slice(0, 64) } : {}),
    route: routePattern(window.location.pathname),
  });
}
