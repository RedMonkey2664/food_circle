import 'server-only';
import type { FollowRow, FriendRow } from '@/lib/domain/relationship';
import { createClient } from '@/lib/supabase/server';

export type Person = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isPrivate: boolean;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_private: boolean;
};

const PERSON_COLUMNS = 'id, username, display_name, avatar_url, is_private';

function toPerson(p: ProfileRow): Person {
  return {
    id: p.id,
    username: p.username,
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
    isPrivate: p.is_private,
  };
}

/** Profiles by id (RLS hides blocked people automatically). */
export async function peopleById(ids: readonly string[]): Promise<Map<string, Person>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select(PERSON_COLUMNS).in('id', unique);
  return new Map((data ?? []).map((p) => [p.id, toPerson(p)]));
}

/** The viewer's own friendship and follow rows (RLS returns only rows they are part of). */
export async function myGraph(): Promise<{ friendships: FriendRow[]; follows: FollowRow[] }> {
  const supabase = await createClient();
  const [f, fo] = await Promise.all([
    supabase.from('friendships').select('user_low, user_high, requested_by, status, accepted_at, created_at'),
    supabase.from('follows').select('follower_id, following_id, status, created_at'),
  ]);
  return { friendships: f.data ?? [], follows: fo.data ?? [] };
}

export type Invite = {
  id: string;
  code: string;
  expiresAt: string;
  uses: number;
  maxUses: number;
};

/** Invites the viewer created that still work: friend invites, or one group's invites. */
export async function myActiveInvites(groupId?: string): Promise<Invite[]> {
  const supabase = await createClient();
  const base = supabase.from('invites').select('id, code, expires_at, uses, max_uses, revoked_at');
  const { data } = await (groupId ? base.eq('group_id', groupId) : base.eq('kind', 'friend'))
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(5);
  return (data ?? [])
    .filter((i) => i.uses < i.max_uses)
    .map((i) => ({ id: i.id, code: i.code, expiresAt: i.expires_at, uses: i.uses, maxUses: i.max_uses }));
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Find people by username or name. Onboarded profiles only; blocked people never appear. */
export async function searchPeople(query: string, viewerId: string): Promise<Person[]> {
  const q = query.trim().replace(/^@/, '').slice(0, 40);
  if (q.length < 2) return [];
  const like = escapeLike(q);
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select(PERSON_COLUMNS)
    .not('onboarded_at', 'is', null)
    .neq('id', viewerId)
    .or(`username.ilike.${like}%,display_name.ilike.%${like}%`)
    .order('username')
    .limit(20);
  return (data ?? []).map(toPerson);
}
