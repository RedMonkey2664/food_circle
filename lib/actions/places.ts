'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { fail, fromDbError, type ActionResult } from '@/lib/domain/errors';
import { createClient } from '@/lib/supabase/server';

const PLACE_TYPES = [
  'restaurant',
  'cafe',
  'street_stall',
  'bakery',
  'sweet_shop',
  'bar',
  'other',
] as const;
const DIET = ['pure_veg', 'veg_options', 'jain', 'halal', 'egg'] as const;

const createPlaceInput = z.object({
  name: z.string().trim().min(2).max(120),
  lat: z.number().min(18.85).max(19.5),
  lng: z.number().min(72.7).max(73.25),
  type: z.enum(PLACE_TYPES),
  dietFlags: z.array(z.enum(DIET)).max(5),
  cuisineTags: z.array(z.string().trim().min(1).max(30)).max(8),
  force: z.boolean(),
});
export type CreatePlaceInput = z.infer<typeof createPlaceInput>;

export type Candidate = { id: string; name: string; areaName: string | null; distanceM: number };

/** P5-01/02: add a place. Returns similar nearby places first unless forced. */
export async function createPlace(
  input: CreatePlaceInput,
): Promise<
  ActionResult<
    { status: 'created'; placeId: string } | { status: 'candidates'; candidates: Candidate[] }
  >
> {
  const parsed = createPlaceInput.safeParse(input);
  if (!parsed.success) return fail('invalid_input', String(parsed.error.issues[0]?.path[0] ?? ''));
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_place', {
    p_name: v.name,
    p_lat: v.lat,
    p_lng: v.lng,
    p_type: v.type,
    p_diet_flags: v.dietFlags,
    p_cuisine_tags: v.cuisineTags,
    p_force: v.force,
  });
  if (error) return { ok: false, ...fromDbError(error) };
  const row = data[0];
  if (!row) return fail('generic');
  if (row.status === 'created' && row.place_id) {
    revalidatePath('/diary');
    return { ok: true, data: { status: 'created', placeId: row.place_id } };
  }
  const list = Array.isArray(row.candidates) ? row.candidates : [];
  return {
    ok: true,
    data: {
      status: 'candidates',
      candidates: list.flatMap((c) =>
        c &&
        typeof c === 'object' &&
        !Array.isArray(c) &&
        typeof c.id === 'string' &&
        typeof c.name === 'string'
          ? [
              {
                id: c.id,
                name: c.name,
                areaName: typeof c.area_name === 'string' ? c.area_name : null,
                distanceM: typeof c.distance_m === 'number' ? c.distance_m : 0,
              },
            ]
          : [],
      ),
    },
  };
}

/** P5-11: save or unsave a place (optionally from someone's verdict). */
export async function setWantToGo(input: {
  placeId: string;
  save: boolean;
  fromVisit?: string;
}): Promise<ActionResult<{ saved: boolean }>> {
  const parsed = z
    .object({ placeId: z.uuid(), save: z.boolean(), fromVisit: z.uuid().optional() })
    .safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return fail('not_authenticated');
  const { error } = parsed.data.save
    ? await supabase.from('want_to_go').upsert(
        {
          user_id: uid,
          place_id: parsed.data.placeId,
          from_visit: parsed.data.fromVisit ?? null,
        },
        { onConflict: 'user_id,place_id', ignoreDuplicates: true },
      )
    : await supabase.from('want_to_go').delete().eq('place_id', parsed.data.placeId);
  if (error) return { ok: false, ...fromDbError(error) };
  revalidatePath('/diary');
  revalidatePath(`/place/${parsed.data.placeId}`);
  return { ok: true, data: { saved: parsed.data.save } };
}

const suggestion = z.discriminatedUnion('field', [
  z.object({ field: z.literal('closed'), placeId: z.uuid() }),
  z.object({
    field: z.literal('moved'),
    placeId: z.uuid(),
    note: z.string().trim().max(200).optional(),
  }),
  z.object({ field: z.literal('type'), placeId: z.uuid(), value: z.enum(PLACE_TYPES) }),
  z.object({
    field: z.literal('diet_flags'),
    placeId: z.uuid(),
    value: z.array(z.enum(DIET)).max(5),
  }),
  z.object({
    field: z.literal('name'),
    placeId: z.uuid(),
    value: z.string().trim().min(2).max(120),
  }),
]);

/** P5-05: "Report closed or moved" and "Know this? Suggest". An admin reviews it. */
export async function suggestPlaceFix(
  input: z.infer<typeof suggestion>,
): Promise<ActionResult<null>> {
  const parsed = suggestion.safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const s = parsed.data;
  const value =
    s.field === 'closed' ? true : s.field === 'moved' ? { note: s.note ?? '' } : s.value;
  const supabase = await createClient();
  const { error } = await supabase.rpc('suggest_place_fix', {
    p_place: s.placeId,
    p_field: s.field,
    p_value: value,
  });
  if (error) return { ok: false, ...fromDbError(error) };
  return { ok: true, data: null };
}

/** P5-08: answer "X tagged you here. Add to your log?" */
export async function respondCompanion(
  _prev: ActionResult<unknown> | null,
  formData: FormData,
): Promise<ActionResult<unknown>> {
  const visit = z.uuid().safeParse(formData.get('visitId'));
  const place = z.uuid().safeParse(formData.get('placeId'));
  const date = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .safeParse(formData.get('date'));
  const add = formData.get('add') === '1';
  if (!visit.success) return fail('invalid_input');
  const supabase = await createClient();
  const { error } = await supabase.rpc('respond_companion_tag', {
    p_visit: visit.data,
    p_add: add,
  });
  if (error) return { ok: false, ...fromDbError(error) };
  revalidatePath('/', 'layout');
  if (add && place.success && date.success) redirect(`/log?place=${place.data}&date=${date.data}`);
  return { ok: true, data: null };
}

// Admin --------------------------------------------------------------------------------------

export async function adminMergePlaces(
  _prev: ActionResult<unknown> | null,
  formData: FormData,
): Promise<ActionResult<unknown>> {
  const source = z.uuid().safeParse(formData.get('source'));
  const target = z.uuid().safeParse(formData.get('target'));
  if (!source.success || !target.success) return fail('invalid_input');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('merge_places', {
    p_source: source.data,
    p_target: target.data,
  });
  if (error) return { ok: false, ...fromDbError(error) };
  revalidatePath(`/place/${target.data}`);
  revalidatePath('/admin/places/merge');
  return { ok: true, data: data[0] ?? null };
}

export async function adminResolveSuggestion(
  _prev: ActionResult<unknown> | null,
  formData: FormData,
): Promise<ActionResult<unknown>> {
  const id = z.uuid().safeParse(formData.get('id'));
  if (!id.success) return fail('invalid_input');
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_resolve_place_suggestion', {
    p_id: id.data,
    p_apply: formData.get('apply') === '1',
  });
  if (error) return { ok: false, ...fromDbError(error) };
  revalidatePath('/admin/places/suggestions');
  return { ok: true, data: null };
}
