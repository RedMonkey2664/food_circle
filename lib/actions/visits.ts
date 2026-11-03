'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fail, fromDbError, type ActionResult } from '@/lib/domain/errors';
import { logVisitInput, type LogVisitInput } from '@/lib/validation/visit';
import { createClient } from '@/lib/supabase/server';

export type LogVisitResult = ActionResult<{ visitId: string }>;

/** P4-07: the next log starts with the audience you chose last time. Best effort. */
async function rememberVisibility(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  visibility: LogVisitInput['visibility'],
) {
  await supabase
    .from('profiles')
    .update({ default_visibility: visibility })
    .eq('id', userId)
    .neq('default_visibility', visibility);
}

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

  // Shared with specific groups: one RPC so the visit is never briefly visible to all friends.
  if (v.groupIds?.length) {
    const { data: visitId, error } = await supabase.rpc('log_visit_for_groups', {
      p_place: v.placeId,
      p_verdict: v.verdict,
      p_groups: v.groupIds,
      ...(v.verdict === 'only_for' && v.onlyForText ? { p_only_for_text: v.onlyForText } : {}),
      ...(v.visitedOn ? { p_visited_on: v.visitedOn } : {}),
    });
    if (error || !visitId) return { ok: false, ...fromDbError(error) };
    await rememberVisibility(supabase, userId, 'friends');
    revalidatePath(`/place/${v.placeId}`);
    revalidatePath('/', 'layout');
    return { ok: true, data: { visitId } };
  }

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

  await rememberVisibility(supabase, userId, v.visibility);
  revalidatePath(`/place/${v.placeId}`);
  revalidatePath('/', 'layout');
  return { ok: true, data: { visitId: data.id } };
}

const placeIdSchema = z.uuid();

export type AfterLogPerson = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  verdict: 'go' | 'skip' | 'only_for';
};

/** P2-04: "N others logged this, follow them?" shown on the success step. */
export async function afterLogSuggestions(
  placeId: string,
): Promise<{ people: AfterLogPerson[]; othersCount: number }> {
  const parsed = placeIdSchema.safeParse(placeId);
  if (!parsed.success) return { people: [], othersCount: 0 };
  const supabase = await createClient();
  const { data } = await supabase.rpc('suggest_people_after_log', {
    p_place: parsed.data,
    p_limit: 3,
  });
  const rows = data ?? [];
  return {
    people: rows.map((r) => ({
      id: r.user_id,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      isPrivate: r.is_private,
      verdict: r.verdict,
    })),
    othersCount: rows[0]?.others_count ?? 0,
  };
}
