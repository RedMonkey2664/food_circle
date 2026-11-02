import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { Visibility } from '@/lib/domain/visibility';
import { createClient } from '@/lib/supabase/server';

export type CurrentUser = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  defaultVisibility: Visibility;
  onboarded: boolean;
};

/**
 * Data Access Layer entry point: verifies the session with Supabase Auth and returns a
 * narrow user object. Redirects to /login when signed out. Call inside a <Suspense> boundary.
 * Wrapped in React cache() so the layout and page share one lookup per request.
 */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url, is_private, default_visibility, onboarded_at')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) redirect('/login?error=profile');

  return {
    id: profile.id,
    displayName: profile.display_name,
    username: profile.username,
    avatarUrl: profile.avatar_url,
    isPrivate: profile.is_private,
    defaultVisibility: profile.default_visibility,
    onboarded: profile.onboarded_at !== null,
  };
});

/** Like requireUser, but sends people who haven't finished onboarding to /onboarding. */
export async function requireOnboardedUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.onboarded) redirect('/onboarding');
  return user;
}
