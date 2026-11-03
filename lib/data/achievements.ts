import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type Achievement = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  /** Your own locked, non-secret achievements only. */
  progress: number | null;
  earnedAt: string | null;
  isSecret: boolean;
  /** 1-3 when pinned to the profile showcase. */
  showcased: number | null;
};

/** Yours: everything (earned, locked with progress, secrets masked). Someone else's: earned only. */
export async function achievements(userId: string): Promise<Achievement[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_achievements', { p_user: userId });
  return (data ?? []).map((r) => ({
    slug: r.slug,
    name: r.name,
    description: r.description,
    icon: r.icon,
    category: r.category,
    threshold: r.threshold,
    progress: r.progress,
    earnedAt: r.earned_at,
    isSecret: r.is_secret,
    showcased: r.showcased,
  }));
}

export type ShowcaseBadge = { slug: string; name: string; icon: string };

/** Pinned badges (up to 3, in order) for many people: profile headers and verdict cards. */
export async function showcases(userIds: readonly string[]): Promise<Map<string, ShowcaseBadge[]>> {
  const ids = [...new Set(userIds)].slice(0, 200);
  const out = new Map<string, ShowcaseBadge[]>();
  if (ids.length === 0) return out;
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_showcases', { p_users: ids });
  for (const r of data ?? []) {
    out.set(r.user_id, [...(out.get(r.user_id) ?? []), { slug: r.slug, name: r.name, icon: r.icon }]);
  }
  return out;
}

export type Progress = {
  allTime: number;
  thisMonth: number;
  level: number;
  currentStreak: number;
  bestStreak: number;
  inGrace: boolean;
  badgesEarned: number;
  badgesTotal: number;
};

/** Your own food journey. Personal only: never ranked or compared with anyone. */
export async function myProgress(): Promise<Progress> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_my_progress');
  const r = data?.[0];
  return {
    allTime: r?.all_time ?? 0,
    thisMonth: r?.this_month ?? 0,
    level: r?.level ?? 0,
    currentStreak: r?.current_streak ?? 0,
    bestStreak: r?.best_streak ?? 0,
    inGrace: r?.in_grace ?? false,
    badgesEarned: r?.badges_earned ?? 0,
    badgesTotal: r?.badges_total ?? 0,
  };
}
