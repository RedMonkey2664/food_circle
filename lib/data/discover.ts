import 'server-only';
import type { Person } from '@/lib/data/social';
import { createClient } from '@/lib/supabase/server';

export type DiscoverKind =
  | 'search'
  | 'taste'
  | 'area'
  | 'cuisine'
  | 'diet'
  | 'friends_of_friends'
  | 'suggested';

export type DiscoverPerson = Person & {
  homeArea: string | null;
  followState: 'accepted' | 'pending' | 'none';
  score: number;
  sharedPlaces: number | null;
  /** Null below the 5-shared-places threshold (never shown then). */
  matchRate: number | null;
};

/** People to discover. Visibility, blocks and exclusions are enforced in the database. */
export async function discoverPeople(
  kind: DiscoverKind,
  param?: string | null,
  limit = 12,
): Promise<DiscoverPerson[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_discover_people', {
    p_kind: kind,
    ...(param ? { p_param: param } : {}),
    p_limit: limit,
  });
  return (data ?? []).map((r) => ({
    id: r.user_id,
    username: r.username,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    isPrivate: r.is_private,
    homeArea: r.home_area,
    followState: r.follow_state === 'accepted' || r.follow_state === 'pending' ? r.follow_state : 'none',
    score: r.score,
    sharedPlaces: r.shared_places,
    matchRate: r.match_rate === null ? null : Number(r.match_rate),
  }));
}

/** Lazy taste-match refresh for the viewer (Discover and profile views). */
export async function refreshMyTasteMatches(): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc('refresh_my_taste_matches');
}

/** The viewer's home area slug (for "people near you"). */
export async function myHomeArea(userId: string): Promise<{ slug: string; name: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('area:areas(slug, name)')
    .eq('id', userId)
    .maybeSingle();
  return data?.area ? { slug: data.area.slug, name: data.area.name } : null;
}
