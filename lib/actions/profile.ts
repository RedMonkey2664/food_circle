'use server';

import { redirect } from 'next/navigation';
import { fail, fromDbError, type ActionResult } from '@/lib/domain/errors';
import { onboardingFromForm, onboardingInput, usernameSchema } from '@/lib/validation/onboarding';
import { createClient } from '@/lib/supabase/server';

/** Live availability check for the username field. */
export async function checkUsername(raw: string): Promise<{ available: boolean; reason?: string }> {
  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) return { available: false, reason: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('username_available', { p_username: parsed.data });
  if (error) return { available: false };
  return data ? { available: true } : { available: false, reason: 'That username is taken.' };
}

export type OnboardingState = ActionResult | null;

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = onboardingInput.safeParse(onboardingFromForm(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ...fail('invalid_input', String(issue?.path[0] ?? '')),
      message: issue?.message ?? 'Check the form.',
    };
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc('complete_onboarding', {
    p_username: v.username,
    p_display_name: v.displayName,
    // generated types mark nullable uuid args as string; null is accepted by the function
    p_home_area: v.homeAreaId as string,
    p_diet_prefs: v.dietPrefs,
    p_is_private: v.isPrivate,
    p_default_visibility: v.defaultVisibility,
  });
  if (error) return { ok: false, ...fromDbError(error) };
  redirect('/');
}
