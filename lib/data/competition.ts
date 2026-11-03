import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type Period = 'week' | 'month' | 'all';
export type BoardRow = {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  verified: number;
  isMe: boolean;
  aheadBy: number | null;
};

/** P6-02: scoped board. Never city-wide: scopes are friends, following, or one of my groups. */
export async function leaderboard(
  scope: 'friends' | 'following' | 'group',
  period: Period,
  groupId?: string,
): Promise<BoardRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_leaderboard', {
    p_scope: scope,
    p_period: period,
    ...(groupId ? { p_group: groupId } : {}),
  });
  return (data ?? []).map((r) => ({
    rank: r.rank,
    userId: r.user_id,
    username: r.username,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    score: r.score,
    verified: r.verified,
    isMe: r.is_me,
    aheadBy: r.ahead_by,
  }));
}

export type Progress = {
  allTime: number;
  thisWeek: number;
  thisMonth: number;
  level: number;
  currentStreak: number;
  bestStreak: number;
  inGrace: boolean;
};

export async function myProgress(): Promise<Progress> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_my_progress');
  const r = data?.[0];
  return {
    allTime: r?.all_time ?? 0,
    thisWeek: r?.this_week ?? 0,
    thisMonth: r?.this_month ?? 0,
    level: r?.level ?? 0,
    currentStreak: r?.current_streak ?? 0,
    bestStreak: r?.best_streak ?? 0,
    inGrace: r?.in_grace ?? false,
  };
}

export type Badge = { slug: string; name: string; description: string; category: string };

/** Level, place count and badges for a profile (own: full count; others: shared places). */
export async function userBadges(
  userId: string,
): Promise<{ level: number; places: number; badges: Badge[] }> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_user_badges', { p_user: userId });
  const rows = data ?? [];
  return {
    level: rows[0]?.level ?? 0,
    places: rows[0]?.places ?? 0,
    badges: rows.flatMap((r) =>
      r.slug && r.name
        ? [{ slug: r.slug, name: r.name, description: r.description ?? '', category: r.category ?? '' }]
        : [],
    ),
  };
}

/** Up to 2 badge names per author, for verdict cards. */
export async function badgesFor(userIds: readonly string[]): Promise<Map<string, string[]>> {
  const ids = [...new Set(userIds)].slice(0, 200);
  const out = new Map<string, string[]>();
  if (ids.length === 0) return out;
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_badges_for_users', { p_users: ids });
  for (const r of data ?? []) out.set(r.user_id, [...(out.get(r.user_id) ?? []), r.name]);
  return out;
}

/** My groups whose owner turned the board on (tabs on the leaderboard page). */
export async function groupsWithBoards(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('groups')
    .select('id, name')
    .eq('leaderboard_enabled', true)
    .order('created_at');
  return data ?? [];
}
