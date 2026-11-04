'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fail, fromDbError, type ActionResult } from '@/lib/domain/errors';
import { createClient } from '@/lib/supabase/server';

const subscription = z.object({
  endpoint: z.string().url().startsWith('https://').max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Save this device's push subscription (after the user tapped "Turn on notifications"). */
export async function savePushSubscription(input: unknown): Promise<ActionResult<null>> {
  const parsed = subscription.safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return fail('not_authenticated');
  // Same device re-subscribing: replace the old row (endpoint is the key).
  await supabase.from('push_subscriptions').delete().eq('endpoint', parsed.data.endpoint);
  const { error } = await supabase.from('push_subscriptions').insert({
    endpoint: parsed.data.endpoint,
    user_id: uid,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });
  if (error) return { ok: false, ...fromDbError(error) };
  return { ok: true, data: null };
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult<null>> {
  const parsed = z.string().url().max(1000).safeParse(endpoint);
  if (!parsed.success) return fail('invalid_input');
  const supabase = await createClient();
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', parsed.data);
  if (error) return { ok: false, ...fromDbError(error) };
  return { ok: true, data: null };
}

export async function setFriendVerdictNotifications(on: boolean): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return fail('not_authenticated');
  const { error } = await supabase
    .from('profiles')
    .update({ notify_friend_verdicts: on })
    .eq('id', uid);
  if (error) return { ok: false, ...fromDbError(error) };
  revalidatePath('/', 'layout');
  return { ok: true, data: null };
}
