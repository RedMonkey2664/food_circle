'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { safeNextPath } from '@/lib/domain/redirect';
import { publicEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

const signInInput = z.object({ next: z.string().max(512).optional() });

async function siteOrigin(): Promise<string> {
  // Prefer the request origin (works on Vercel previews); fall back to the configured URL.
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return host ? `${proto}://${host}` : publicEnv().NEXT_PUBLIC_SITE_URL;
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const parsed = signInInput.safeParse({ next: formData.get('next') ?? undefined });
  const next = safeNextPath(parsed.success ? parsed.data.next : undefined);

  const supabase = await createClient();
  const callback = new URL('/auth/callback', await siteOrigin());
  callback.searchParams.set('next', next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback.toString() },
  });
  if (error || !data.url) redirect('/login?error=oauth');
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
