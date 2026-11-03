import 'server-only';
import type { VerdictCardData } from '@/components/verdict/VerdictCard';
import { createClient } from '@/lib/supabase/server';

export type Profile = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isPrivate: boolean;
  homeArea: string | null;
  leaderboardsOptIn: boolean;
};

export type ProfileStats = {
  friends: number;
  followers: number;
  following: number;
  visitsVisible: number;
  placesVisible: number;
  areasVisible: number;
  sharedPlaces: number | null;
  /** Viewer's taste match with this person; null below 5 shared places. */
  matchRate: number | null;
};

/** A profile by username. Null when it doesn't exist or either side blocked the other (RLS). */
export async function profileByUsername(username: string): Promise<Profile | null> {
  if (!/^[a-z0-9_.]{3,40}$/i.test(username)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, is_private, onboarded_at, leaderboards_opt_in, home_area:areas(name)')
    .eq('username', username.toLowerCase())
    .maybeSingle();
  if (!data || !data.onboarded_at) return null;
  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    bio: data.bio,
    avatarUrl: data.avatar_url,
    isPrivate: data.is_private,
    homeArea: data.home_area?.name ?? null,
    leaderboardsOptIn: data.leaderboards_opt_in,
  };
}

export async function profileStats(userId: string): Promise<ProfileStats> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_profile_stats', { p_user: userId });
  const row = data?.[0];
  return {
    friends: row?.friends ?? 0,
    followers: row?.followers ?? 0,
    following: row?.following ?? 0,
    visitsVisible: row?.visits_visible ?? 0,
    placesVisible: row?.places_visible ?? 0,
    areasVisible: row?.areas_visible ?? 0,
    sharedPlaces: row?.shared_places ?? null,
    matchRate: row?.match_rate == null ? null : Number(row.match_rate),
  };
}

/** Recent visits by one person that the viewer is allowed to see (RLS filters the rest). */
export async function recentVisitsBy(userId: string, limit = 20): Promise<VerdictCardData[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('visits')
    .select('id, verdict, only_for_text, visited_on, visibility, place:places(id, name, area:areas(name))')
    .eq('user_id', userId)
    .order('visited_on', { ascending: false })
    .order('logged_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((v) => ({
    visitId: v.id,
    verdict: v.verdict,
    onlyForText: v.only_for_text,
    visitedOn: v.visited_on,
    place: v.place ? { id: v.place.id, name: v.place.name, areaName: v.place.area?.name ?? null } : undefined,
    ownVisibility: v.visibility,
  }));
}
