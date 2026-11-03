'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fail, fromDbError, type ActionResult } from '@/lib/domain/errors';
import { createClient } from '@/lib/supabase/server';

export type FeedbackReason = 'new_place' | 'all_time_only' | 'repeat' | 'daily_cap' | 'chain_cap';
export type VisitFeedback = {
  reason: FeedbackReason;
  monthScore: number;
  rivalName: string | null;
  rivalAheadBy: number | null;
};

const REASONS: FeedbackReason[] = [
  'new_place',
  'all_time_only',
  'repeat',
  'daily_cap',
  'chain_cap',
];

/** P6-03: did this visit count, and who is just ahead this month? Read-only. */
export async function visitFeedback(visitId: string): Promise<VisitFeedback | null> {
  const id = z.uuid().safeParse(visitId);
  if (!id.success) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_visit_feedback', { p_visit: id.data });
  const r = data?.[0];
  if (!r) return null;
  return {
    reason: REASONS.includes(r.reason as FeedbackReason) ? (r.reason as FeedbackReason) : 'repeat',
    monthScore: r.month_score,
    rivalName: r.rival_name,
    rivalAheadBy: r.rival_ahead_by,
  };
}

/** P6-07: verify a fresh visit from the device location (asked only on tap). */
export async function verifyVisit(input: {
  visitId: string;
  lat: number;
  lng: number;
}): Promise<ActionResult<{ verified: boolean }>> {
  const parsed = z
    .object({
      visitId: z.uuid(),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('verify_visit', {
    p_visit: parsed.data.visitId,
    p_lat: parsed.data.lat,
    p_lng: parsed.data.lng,
  });
  if (error) return { ok: false, ...fromDbError(error) };
  if (data) revalidatePath('/leaderboard');
  return { ok: true, data: { verified: Boolean(data) } };
}

export async function setLeaderboardOptIn(
  _prev: ActionResult<unknown> | null,
  formData: FormData,
): Promise<ActionResult<unknown>> {
  const on = formData.get('on') === '1';
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return fail('not_authenticated');
  const { error } = await supabase
    .from('profiles')
    .update({ leaderboards_opt_in: on })
    .eq('id', uid);
  if (error) return { ok: false, ...fromDbError(error) };
  revalidatePath('/leaderboard');
  revalidatePath('/', 'layout');
  return { ok: true, data: null };
}

export async function setGroupLeaderboard(
  _prev: ActionResult<unknown> | null,
  formData: FormData,
): Promise<ActionResult<unknown>> {
  const g = z.uuid().safeParse(formData.get('groupId'));
  if (!g.success) return fail('invalid_input');
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_group_leaderboard', {
    p_group: g.data,
    p_enabled: formData.get('on') === '1',
  });
  if (error) return { ok: false, ...fromDbError(error) };
  revalidatePath(`/groups/${g.data}`);
  revalidatePath('/leaderboard');
  return { ok: true, data: null };
}
