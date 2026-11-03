'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fail, fromDbError, type ActionResult } from '@/lib/domain/errors';
import { createClient } from '@/lib/supabase/server';

export type Unlocked = { name: string; icon: string; description: string };
export type VisitFeedback = { reason: 'new_place' | 'repeat' | 'capped'; unlocked: Unlocked[] };

/** After logging: was it a new place, and which achievements did it just unlock? */
export async function visitFeedback(visitId: string): Promise<VisitFeedback | null> {
  const id = z.uuid().safeParse(visitId);
  if (!id.success) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_visit_feedback', { p_visit: id.data });
  const r = data?.[0];
  if (!r) return null;
  const list = Array.isArray(r.unlocked) ? r.unlocked : [];
  return {
    reason: r.reason === 'new_place' || r.reason === 'repeat' ? r.reason : 'capped',
    unlocked: list.flatMap((u) =>
      u && typeof u === 'object' && !Array.isArray(u) && typeof u.name === 'string'
        ? [
            {
              name: u.name,
              icon: typeof u.icon === 'string' ? u.icon : '🏅',
              description: typeof u.description === 'string' ? u.description : '',
            },
          ]
        : [],
    ),
  };
}

const slugs = z.array(z.string().regex(/^[a-z0-9-]{2,40}$/)).max(3);

/** Pin up to 3 earned badges on your profile (order = position). */
export async function setShowcase(input: string[]): Promise<ActionResult<null>> {
  const parsed = slugs.safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_showcase', { p_slugs: parsed.data });
  if (error) return { ok: false, ...fromDbError(error) };
  revalidatePath('/achievements');
  revalidatePath('/', 'layout');
  return { ok: true, data: null };
}
