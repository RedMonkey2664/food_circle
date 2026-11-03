import 'server-only';
import type { VerdictCardData } from '@/components/verdict/VerdictCard';
import type { PlaceType } from '@/lib/domain/place';
import { summaryFromRows, type PlaceSummary } from '@/lib/domain/summary';
import { withDetails } from '@/lib/data/details';
import { tierFromNumber } from '@/lib/domain/tiers';
import { createClient } from '@/lib/supabase/server';

export type PlaceDetail = {
  id: string;
  name: string;
  areaName: string | null;
  type: PlaceType;
  dietFlags: string[];
  cuisineTags: string[];
  status: 'unverified' | 'confirmed' | 'merged' | 'closed';
  /** Set when the requested id was merged into this place (redirect). */
  mergedFrom: boolean;
  brandName: string | null;
};

export async function getPlace(id: string): Promise<PlaceDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_place', { p_place: id });
  const p = data?.[0];
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    areaName: p.area_name,
    type: p.type,
    dietFlags: p.diet_flags,
    cuisineTags: p.cuisine_tags,
    status: p.status,
    mergedFrom: p.merged_into !== null,
    brandName: p.brand_name,
  };
}

export async function getPlaceSummary(id: string): Promise<PlaceSummary> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_place_summary', { p_place: id });
  return summaryFromRows(data ?? []);
}

export type TierFilter = 'friends' | 'friends_following' | 'everyone';

export type PlaceVerdict = VerdictCardData & { tierNumber: number };

export async function getPlaceVerdicts(id: string, filter: TierFilter): Promise<PlaceVerdict[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_place_verdicts', { p_place: id, p_tier_filter: filter });
  const rows: PlaceVerdict[] = (data ?? []).map((v) => ({
    visitId: v.visit_id,
    verdict: v.verdict,
    onlyForText: v.only_for_text,
    visitedOn: v.visited_on,
    author: { username: v.username, displayName: v.display_name, avatarUrl: v.avatar_url },
    tier: tierFromNumber(v.tier) ?? undefined,
    groupName: v.group_name,
    tierNumber: v.tier,
  }));
  return withDetails(rows);
}

export type PlaceSearchResult = {
  id: string;
  name: string;
  areaName: string | null;
  type: PlaceType;
  dietFlags: string[];
};

export async function searchPlaces(query: string, limit = 20): Promise<PlaceSearchResult[]> {
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc('search_places', { p_query: q, p_limit: limit });
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    areaName: r.area_name,
    type: r.type,
    dietFlags: r.diet_flags,
  }));
}

/** Does the viewer have any accepted friends? (drives the "add friends" nudge) */
export async function hasFriends(): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('friendships')
    .select('user_low', { count: 'exact', head: true })
    .eq('status', 'accepted');
  return (count ?? 0) > 0;
}
