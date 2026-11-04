'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { pushToUsers } from '@/lib/push';
import { z } from 'zod';
import { fail, fromDbError, type ActionResult } from '@/lib/domain/errors';
import { createClient } from '@/lib/supabase/server';

const memoryInput = z.object({
  visitId: z.uuid(),
  privateNote: z.string().trim().max(2000),
  mood: z.string().trim().max(30),
  occasion: z.string().trim().max(60),
  // Memories default to private; "friends" means friends who can also see the visit.
  visibility: z.enum(['private', 'friends']),
  companions: z.array(z.uuid()).max(20),
});
export type MemoryInput = z.infer<typeof memoryInput>;

/**
 * P5-07/P5-08: the private memory layer and companion tags. Tagging a friend never gives
 * them (or you) points; they get an "Add to your log?" prompt instead.
 */
export async function saveMemory(input: MemoryInput): Promise<ActionResult<null>> {
  const parsed = memoryInput.safeParse(input);
  if (!parsed.success) return fail('invalid_input', String(parsed.error.issues[0]?.path[0] ?? ''));
  const v = parsed.data;
  const supabase = await createClient();

  // Not an upsert: ON CONFLICT DO UPDATE would also update visit_id, which column grants
  // (rightly) don't allow. Update if it exists, otherwise insert.
  const fields = {
    private_note: v.privateNote || null,
    mood: v.mood || null,
    occasion: v.occasion || null,
    visibility: v.visibility,
  };
  const { data: existing } = await supabase
    .from('memories')
    .select('visit_id')
    .eq('visit_id', v.visitId)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from('memories').update(fields).eq('visit_id', v.visitId)
    : await supabase.from('memories').insert({ visit_id: v.visitId, ...fields });
  if (error) return { ok: false, ...fromDbError(error) };

  const { data: current } = await supabase
    .from('visit_companions')
    .select('user_id')
    .eq('visit_id', v.visitId);
  const have = new Set((current ?? []).map((c) => c.user_id));
  const want = new Set(v.companions);
  const remove = [...have].filter((id) => !want.has(id));
  const add = [...want].filter((id) => !have.has(id));
  if (remove.length) {
    const r = await supabase
      .from('visit_companions')
      .delete()
      .eq('visit_id', v.visitId)
      .in('user_id', remove);
    if (r.error) return { ok: false, ...fromDbError(r.error) };
  }
  if (add.length) {
    const r = await supabase
      .from('visit_companions')
      .insert(add.map((user_id) => ({ visit_id: v.visitId, user_id })));
    if (r.error) return { ok: false, ...fromDbError(r.error) };
    after(async () => {
      const { data: visit } = await supabase
        .from('visits')
        .select('place:places(name), author:profiles(display_name)')
        .eq('id', v.visitId)
        .maybeSingle();
      await pushToUsers(add, {
        title: `${visit?.author?.display_name ?? 'A friend'} tagged you`,
        body: `At ${visit?.place?.name ?? 'a place'}. Add it to your log?`,
        url: '/',
        tag: `tag-${v.visitId}`,
      });
    });
  }
  revalidatePath(`/visit/${v.visitId}`);
  revalidatePath('/diary');
  return { ok: true, data: null };
}
