/**
 * Returns a safe same-origin path to redirect to after login, or '/' if the input is unsafe.
 * Blocks open redirects such as '//evil.com', '/\\evil.com' and absolute URLs.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return '/';
  if (!next.startsWith('/')) return '/';
  if (next.startsWith('//') || next.startsWith('/\\')) return '/';
  if (/[\r\n\t]/.test(next)) return '/';
  if (next.length > 512) return '/';
  return next;
}

/** Paths reachable without a session. Everything else needs sign-in. */
export const PUBLIC_PATH_PREFIXES = ['/login', '/auth/', '/invite/'] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) =>
    p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(`${p}/`),
  );
}
