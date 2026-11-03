'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { fail, fromDbError, type ActionResult } from '@/lib/domain/errors';
import { createClient } from '@/lib/supabase/server';

// Group mutations: Zod at the boundary; security-definer RPCs enforce ownership and the
// friends-only rule (P3-01, P3-02).

const id = z.uuid();
const createInput = z.object({
  name: z.string().trim().min(1).max(40),
  kind: z.enum(['family', 'friends', 'custom']),
});

function refresh(groupId?: string) {
  revalidatePath('/groups');
  revalidatePath('/', 'layout');
  if (groupId) revalidatePath(`/groups/${groupId}`);
}

export async function createGroup(
  _prev: ActionResult<unknown> | null,
  formData: FormData,
): Promise<ActionResult<unknown>> {
  const parsed = createInput.safeParse({ name: formData.get('name'), kind: formData.get('kind') });
  if (!parsed.success) return fail('invalid_input', String(parsed.error.issues[0]?.path[0] ?? ''));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_group', {
    p_name: parsed.data.name,
    p_kind: parsed.data.kind,
  });
  if (error || !data) return { ok: false, ...fromDbError(error) };
  refresh();
  redirect(`/groups/${data}`);
}

export async function addGroupMember(
  _prev: ActionResult<unknown> | null,
  formData: FormData,
): Promise<ActionResult<unknown>> {
  const g = id.safeParse(formData.get('groupId'));
  const u = id.safeParse(formData.get('userId'));
  if (!g.success || !u.success) return fail('invalid_input');
  const supabase = await createClient();
  const { error } = await supabase.rpc('add_group_member', { p_group: g.data, p_user: u.data });
  if (error) return { ok: false, ...fromDbError(error) };
  refresh(g.data);
  return { ok: true, data: null };
}

/** Owner removes a member, or a member removes themself (leave, then back to the list). */
export async function removeGroupMember(
  _prev: ActionResult<unknown> | null,
  formData: FormData,
): Promise<ActionResult<unknown>> {
  const g = id.safeParse(formData.get('groupId'));
  const u = id.safeParse(formData.get('userId'));
  if (!g.success || !u.success) return fail('invalid_input');
  const supabase = await createClient();
  const { error } = await supabase.rpc('remove_group_member', { p_group: g.data, p_user: u.data });
  if (error) return { ok: false, ...fromDbError(error) };
  refresh(g.data);
  if (formData.get('leaving') === '1') redirect('/groups');
  return { ok: true, data: null };
}

export async function deleteGroup(
  _prev: ActionResult<unknown> | null,
  formData: FormData,
): Promise<ActionResult<unknown>> {
  const g = id.safeParse(formData.get('groupId'));
  if (!g.success) return fail('invalid_input');
  const supabase = await createClient();
  const { error } = await supabase.rpc('delete_group', { p_group: g.data });
  if (error) return { ok: false, ...fromDbError(error) };
  refresh(g.data);
  redirect('/groups');
}
