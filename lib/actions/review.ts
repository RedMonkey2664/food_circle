'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fail, fromDbError, type ActionResult } from '@/lib/domain/errors';
import { createClient } from '@/lib/supabase/server';
import { photoPath, saveReviewInput, type SaveReviewInput } from '@/lib/validation/review';

const BUCKET = 'review-photos';

async function refreshForVisit(visitId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('visits').select('place_id').eq('id', visitId).maybeSingle();
  if (data) revalidatePath(`/place/${data.place_id}`);
  revalidatePath(`/visit/${visitId}`);
  revalidatePath('/', 'layout');
}

/** Save the optional review layer (note, price, occasions, dishes) in one transaction. */
export async function saveReview(input: SaveReviewInput): Promise<ActionResult<null>> {
  const parsed = saveReviewInput.safeParse(input);
  if (!parsed.success) return fail('invalid_input', String(parsed.error.issues[0]?.path[0] ?? ''));
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc('save_review', {
    p_visit: v.visitId,
    ...(v.note !== undefined ? { p_note: v.note } : {}),
    ...(v.pricePerHead != null ? { p_price: v.pricePerHead } : {}),
    p_occasions: v.occasions ?? [],
    p_dishes: v.dishes ?? [],
  });
  if (error) return { ok: false, ...fromDbError(error) };
  await refreshForVisit(v.visitId);
  return { ok: true, data: null };
}

/** Record an uploaded photo (the browser uploaded the compressed WebP to its own folder). */
export async function addPhoto(input: {
  visitId: string;
  path: string;
  width: number;
  height: number;
}): Promise<ActionResult<null>> {
  const parsed = z
    .object({
      visitId: z.uuid(),
      path: photoPath,
      width: z.number().int().min(1).max(4096),
      height: z.number().int().min(1).max(4096),
    })
    .safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const supabase = await createClient();
  const { count } = await supabase
    .from('visit_photos')
    .select('id', { count: 'exact', head: true })
    .eq('visit_id', parsed.data.visitId);
  const { error } = await supabase.from('visit_photos').insert({
    visit_id: parsed.data.visitId,
    kind: 'review',
    storage_path: parsed.data.path,
    width: parsed.data.width,
    height: parsed.data.height,
    position: count ?? 0,
  });
  if (error) {
    // Don't leave an orphaned object behind if the row was rejected (e.g. 7th photo).
    await supabase.storage.from(BUCKET).remove([parsed.data.path]);
    return { ok: false, ...fromDbError(error) };
  }
  await refreshForVisit(parsed.data.visitId);
  return { ok: true, data: null };
}

export async function removePhoto(input: {
  visitId: string;
  path: string;
}): Promise<ActionResult<null>> {
  const parsed = z.object({ visitId: z.uuid(), path: photoPath }).safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const supabase = await createClient();
  const { error } = await supabase
    .from('visit_photos')
    .delete()
    .eq('visit_id', parsed.data.visitId)
    .eq('storage_path', parsed.data.path);
  if (error) return { ok: false, ...fromDbError(error) };
  await supabase.storage.from(BUCKET).remove([parsed.data.path]);
  await refreshForVisit(parsed.data.visitId);
  return { ok: true, data: null };
}

/** P4-06: delete the review layer. The visit (verdict) and its point stay. */
export async function deleteReview(visitId: string): Promise<ActionResult<null>> {
  const id = z.uuid().safeParse(visitId);
  if (!id.success) return fail('invalid_input');
  const supabase = await createClient();
  const { data: photos } = await supabase
    .from('visit_photos')
    .select('storage_path')
    .eq('visit_id', id.data)
    .eq('kind', 'review');
  const results = await Promise.all([
    supabase.from('visit_photos').delete().eq('visit_id', id.data).eq('kind', 'review'),
    supabase.from('review_dishes').delete().eq('visit_id', id.data),
    supabase.from('reviews').delete().eq('visit_id', id.data),
  ]);
  const error = results.find((r) => r.error)?.error ?? null;
  if (error) return { ok: false, ...fromDbError(error) };
  const paths = (photos ?? []).map((p) => p.storage_path);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  await refreshForVisit(id.data);
  return { ok: true, data: null };
}
