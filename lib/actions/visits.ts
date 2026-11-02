'use server';

import { revalidatePath } from 'next/cache';
import { fail, fromDbError, type ActionResult } from '@/lib/domain/errors';
import { logVisitInput, type LogVisitInput } from '@/lib/validation/visit';
import { createClient } from '@/lib/supabase/server';

export type LogVisitResult = ActionResult<{ visitId: string }>;

/**
 * Log a visit. A direct insert: RLS checks it's yours and column grants stop clients from
 * touching computed columns (flags, verified, logged_at).
 */
export async function logVisit(input: LogVisitInput): Promise<LogVisitResult> {
  const parsed = logVisitInput.safeParse(input);
  if (!parsed.success) return fail('invalid_input', String(parsed.error.issues[0]?.path[0] ?? ''));
  const v = parsed.data;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return fail('not_authenticated');

  const { data, error } = await supabase
    .from('visits')
    .insert({
      user_id: userId,
      place_id: v.placeId,
      verdict: v.verdict,
      only_for_text: v.verdict === 'only_for' ? (v.onlyForText ?? null) : null,
      visibility: v.visibility,
      ...(v.visitedOn ? { visited_on: v.visitedOn } : {}),
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, ...fromDbError(error) };

  revalidatePath(`/place/${v.placeId}`);
  revalidatePath('/', 'layout');
  return { ok: true, data: { visitId: data.id } };
}
