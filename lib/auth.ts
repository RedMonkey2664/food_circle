import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type CurrentUser = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  onboarded: boolean;
};

/**
 * Data Access Layer entry point: verifies the session with Supabase Auth and returns a
 * narrow user object. Redirects to /login when signed out. Call inside a <Suspense> boundary.
 */
export async function requireUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url, onboarded_at')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) redirect('/login?error=profile');

  return {
    id: profile.id,
    displayName: profile.display_name,
    username: profile.username,
    avatarUrl: profile.avatar_url,
    onboarded: profile.onboarded_at !== null,
  };
}
