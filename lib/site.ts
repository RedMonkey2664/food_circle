import 'server-only';
import { headers } from 'next/headers';
import { publicEnv } from '@/lib/env';

/**
 * The origin the user is actually on (works for localhost, Vercel previews and production).
 * Falls back to NEXT_PUBLIC_SITE_URL when there is no request.
 */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
  return host ? `${proto}://${host}` : publicEnv().NEXT_PUBLIC_SITE_URL;
}
