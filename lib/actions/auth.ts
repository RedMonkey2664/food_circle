'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { safeNextPath } from '@/lib/domain/redirect';
import { publicEnv } from '@/lib/env';
import { siteOrigin } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';

const signInInput = z.object({ next: z.string().max(512).optional() });

const authSettings = z.object({ external: z.object({ google: z.boolean() }) });

/** Asks Supabase Auth whether the Google provider is switched on (public settings endpoint). */
async function googleEnabled(): Promise<boolean> {
  const env = publicEnv();
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      cache: 'no-store',
    });
    const parsed = authSettings.safeParse(await res.json());
    return parsed.success && parsed.data.external.google;
  } catch {
    return true; // can't tell: let Supabase handle it rather than block sign-in
  }
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const parsed = signInInput.safeParse({ next: formData.get('next') ?? undefined });
  const next = safeNextPath(parsed.success ? parsed.data.next : undefined);

  // Without this, a disabled provider sends the user to a raw JSON error page.
  if (!(await googleEnabled())) redirect('/login?error=provider');

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
