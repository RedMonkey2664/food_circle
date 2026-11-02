'use server';

import { notFound, redirect } from 'next/navigation';
import { DEV_PASSWORD, DEV_USERS, devToolsEnabled } from '@/lib/dev';
import { createClient } from '@/lib/supabase/server';

/** Signs in as a seed user. Local development only. */
export async function devSignIn(formData: FormData): Promise<void> {
  if (!devToolsEnabled()) notFound();
  const username = String(formData.get('username') ?? '');
  if (!DEV_USERS.some((u) => u.username === username)) notFound();

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: `${username}@example.test`,
    password: DEV_PASSWORD,
  });
  if (error) redirect('/dev/login?error=1');
  redirect('/');
}
