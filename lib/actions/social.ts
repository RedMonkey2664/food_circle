'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { fail, fromDbError, type ActionResult } from '@/lib/domain/errors';
import { safeNextPath } from '@/lib/domain/redirect';
import { createClient } from '@/lib/supabase/server';

// Every social mutation: validate input with Zod, call the security-definer RPC with the
// user's session, map errors to stable codes, refresh the pages that show relationships.

const userId = z.uuid();

function refresh(path?: string) {
  revalidatePath('/friends');
  revalidatePath('/', 'layout');
  if (path) revalidatePath(path);
}

async function call(
  fn: string,
  args: Record<string, unknown>,
  path?: string,
): Promise<ActionResult<unknown>> {
  const supabase = await createClient();
  // RPC names are typed by the generated client; the wrappers below pass known names only.
  const { data, error } = await (
    supabase.rpc as unknown as (
      f: string,
      a: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string; details: string | null } | null }>
  )(fn, args);
  if (error) return { ok: false, ...fromDbError(error) };
  refresh(path);
  return { ok: true, data };
}

function target(formData: FormData) {
  const parsed = userId.safeParse(formData.get('userId'));
  return parsed.success ? parsed.data : null;
}

function pathFrom(formData: FormData) {
  const p = formData.get('path');
  return typeof p === 'string' ? safeNextPath(p) : undefined;
}

type FormAction = (
  prev: ActionResult<unknown> | null,
  formData: FormData,
) => Promise<ActionResult<unknown>>;

function userAction(
  fn: string,
  arg: string,
  extra?: (f: FormData) => Record<string, unknown>,
): FormAction {
  return async (_prev, formData) => {
    const id = target(formData);
    if (!id) return fail('invalid_input');
    return call(fn, { [arg]: id, ...(extra ? extra(formData) : {}) }, pathFrom(formData));
  };
}

const accept = (f: FormData) => ({ p_accept: f.get('accept') === 'true' });

export const requestFriend: FormAction = async (p, f) =>
  userAction('request_friend', 'p_target')(p, f);
export const respondFriend: FormAction = async (p, f) =>
  userAction('respond_friend', 'p_other', accept)(p, f);
export const cancelFriendRequest: FormAction = async (p, f) =>
  userAction('cancel_friend_request', 'p_other')(p, f);
export const removeFriend: FormAction = async (p, f) =>
  userAction('remove_friend', 'p_other')(p, f);
export const followUser: FormAction = async (p, f) => userAction('follow_user', 'p_target')(p, f);
export const unfollowUser: FormAction = async (p, f) =>
  userAction('unfollow_user', 'p_target')(p, f);
export const respondFollow: FormAction = async (p, f) =>
  userAction('respond_follow', 'p_follower', accept)(p, f);
export const removeFollower: FormAction = async (p, f) =>
  userAction('remove_follower', 'p_follower')(p, f);
export const blockUser: FormAction = async (p, f) => {
  const r = await userAction('block_user', 'p_target')(p, f);
  // Their profile disappears for you once blocked, so leave the page.
  if (r.ok) redirect('/friends?blocked=1');
  return r;
};
export const unblockUser: FormAction = async (p, f) => userAction('unblock_user', 'p_target')(p, f);

// Invites -----------------------------------------------------------------------------------

export async function createInvite(
  groupId?: string,
): Promise<ActionResult<{ code: string; expiresAt: string }>> {
  const group = groupId === undefined ? null : z.uuid().safeParse(groupId);
  if (group && !group.success) return fail('invalid_input');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'create_invite',
    group ? { p_kind: 'group', p_group: group.data } : { p_kind: 'friend' },
  );
  if (error) return { ok: false, ...fromDbError(error) };
  const row = data[0];
  if (!row) return fail('generic');
  revalidatePath(group ? `/groups/${group.data}` : '/friends');
  return { ok: true, data: { code: row.code, expiresAt: row.expires_at } };
}

export async function revokeInvite(_prev: ActionResult<unknown> | null, formData: FormData) {
  const id = z.uuid().safeParse(formData.get('inviteId'));
  if (!id.success) return fail('invalid_input');
  return call('revoke_invite', { p_invite: id.data });
}

const inviteCode = z.string().regex(/^[A-Za-z0-9_-]{22,64}$/);

export async function redeemInvite(_prev: ActionResult<unknown> | null, formData: FormData) {
  const code = inviteCode.safeParse(formData.get('code'));
  if (!code.success) return fail('not_found');
  const befriend = formData.get('befriend') === '1';
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('redeem_invite', {
    p_code: code.data,
    p_befriend: befriend,
  });
  if (error) return { ok: false as const, ...fromDbError(error) };
  refresh();
  const groupId = data[0]?.group_id;
  if (groupId) {
    revalidatePath('/groups');
    redirect(`/groups/${groupId}?joined=1`);
  }
  redirect('/friends?added=1');
}

// Reports -----------------------------------------------------------------------------------

const reportInput = z.object({
  type: z.enum(['user', 'visit', 'place']),
  id: z.uuid(),
  reason: z.string().trim().min(1, 'Tell us what is wrong.').max(500),
});

export async function reportContent(_prev: ActionResult<unknown> | null, formData: FormData) {
  const parsed = reportInput.safeParse({
    type: formData.get('type'),
    id: formData.get('id'),
    reason: formData.get('reason'),
  });
  if (!parsed.success) return fail('invalid_input');
  return call('report_content', {
    p_type: parsed.data.type,
    p_id: parsed.data.id,
    p_reason: parsed.data.reason,
  });
}
