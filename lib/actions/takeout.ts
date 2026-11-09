'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fail, type ActionResult } from '@/lib/domain/errors';
import { VERDICTS } from '@/lib/domain/verdict';
import { VISIBILITIES } from '@/lib/domain/visibility';
import { createClient } from '@/lib/supabase/server';

const point = { lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) };

export type ImportMatch = {
  idx: number;
  placeId: string;
  placeName: string;
  areaName: string | null;
  visited: boolean;
};

/** Match Takeout entries (name + location) to SKOOP places. Up to 300 per call. */
export async function matchTakeout(
  items: { name: string; lat: number; lng: number }[],
): Promise<ActionResult<ImportMatch[]>> {
  const parsed = z
    .array(z.object({ name: z.string().trim().min(1).max(120), ...point }))
    .max(300)
    .safeParse(items);
  if (!parsed.success) return fail('invalid_input');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('match_import_places', { p_items: parsed.data });
  if (error) return fail('invalid_input');
  return {
    ok: true,
    data: (data ?? []).map((r) => ({
      idx: r.idx,
      placeId: r.place_id,
      placeName: r.place_name,
      areaName: r.area_name,
      visited: r.visited,
    })),
  };
}

const entry = z.object({
  placeId: z.uuid().optional(),
  /** Not on SKOOP yet: added as a new, unverified place. India only (like Add a place). */
  newPlace: z
    .object({
      name: z.string().trim().min(2).max(120),
      lat: z.number().min(6).max(37.5),
      lng: z.number().min(68).max(98),
    })
    .optional(),
  verdict: z.enum(VERDICTS).exclude(['only_for']).optional(),
  save: z.boolean().optional(),
  visitedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  note: z.string().trim().max(1000).optional(),
});

export type ImportEntry = z.infer<typeof entry>;
export type ImportSummary = { logged: number; saved: number; added: number; skipped: number };

/**
 * Import chosen entries: reviews become visits (with the chosen audience), saved places go to
 * Want to go. Places already in your diary are skipped, so importing twice is safe. Imports
 * send no push notifications (nobody wants 100 pings).
 */
export async function importTakeout(input: {
  visibility: (typeof VISIBILITIES)[number];
  entries: ImportEntry[];
}): Promise<ActionResult<ImportSummary>> {
  const parsed = z
    .object({ visibility: z.enum(VISIBILITIES), entries: z.array(entry).min(1).max(100) })
    .safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return fail('not_authenticated');

  const known = parsed.data.entries.map((e) => e.placeId).filter((x): x is string => Boolean(x));
  const { data: mine } = known.length
    ? await supabase.from('visits').select('place_id').eq('user_id', userId).in('place_id', known)
    : { data: [] as { place_id: string }[] };
  const visited = new Set((mine ?? []).map((v) => v.place_id));

  const summary: ImportSummary = { logged: 0, saved: 0, added: 0, skipped: 0 };
  for (const e of parsed.data.entries) {
    let placeId = e.placeId;
    if (!placeId && e.newPlace) {
      const { data } = await supabase.rpc('create_place', {
        p_name: e.newPlace.name,
        p_lat: e.newPlace.lat,
        p_lng: e.newPlace.lng,
        p_type: 'restaurant',
        p_force: true,
      });
      placeId = data?.[0]?.place_id ?? undefined;
      if (placeId) summary.added++;
    }
    if (!placeId) {
      summary.skipped++;
      continue;
    }

    if (e.save) {
      const { error } = await supabase
        .from('want_to_go')
        .upsert(
          { user_id: userId, place_id: placeId },
          { onConflict: 'user_id,place_id', ignoreDuplicates: true },
        );
      if (error) summary.skipped++;
      else summary.saved++;
      continue;
    }

    if (!e.verdict || visited.has(placeId)) {
      summary.skipped++;
      continue;
    }
    const { data: visit, error } = await supabase
      .from('visits')
      .insert({
        user_id: userId,
        place_id: placeId,
        verdict: e.verdict,
        visibility: parsed.data.visibility,
        ...(e.visitedOn ? { visited_on: e.visitedOn } : {}),
      })
      .select('id')
      .single();
    if (error || !visit) {
      summary.skipped++;
      continue;
    }
    visited.add(placeId);
    summary.logged++;
    if (e.note) {
      await supabase.rpc('save_review', { p_visit: visit.id, p_note: e.note });
    }
  }
  revalidatePath('/', 'layout');
  return { ok: true, data: summary };
}
