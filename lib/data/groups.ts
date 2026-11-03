import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type GroupKind = 'family' | 'friends' | 'custom';

export type MyGroup = {
  id: string;
  name: string;
  kind: GroupKind;
  isOwner: boolean;
  memberCount: number;
};

export type GroupMember = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOwner: boolean;
};

const toKind = (k: string): GroupKind => (k === 'family' || k === 'friends' ? k : 'custom');

/** Groups I'm in, oldest first (stable order for feed tabs and pickers). */
export async function myGroups(): Promise<MyGroup[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_my_groups');
  return (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    kind: toKind(g.kind),
    isOwner: g.role === 'owner',
    memberCount: g.member_count,
  }));
}

/** Members of a group I belong to (empty otherwise). Owner first. */
export async function groupMembers(groupId: string): Promise<GroupMember[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_group_members', { p_group: groupId });
  return (data ?? []).map((m) => ({
    id: m.user_id,
    username: m.username,
    displayName: m.display_name,
    avatarUrl: m.avatar_url,
    isOwner: m.role === 'owner',
  }));
}
