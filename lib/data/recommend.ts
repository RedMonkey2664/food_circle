import 'server-only';
import type { PlaceType } from '@/lib/domain/place';
import { createClient } from '@/lib/supabase/server';

export type RecommendedPlace = {
  id: string;
  name: string;
  areaName: string | null;
  type: PlaceType;
  distanceM: number;
  /** Per tier, never blended (CLAUDE.md rule 1). */
  friends: { go: number; went: number };
  following: { go: number; went: number };
  everyone: { go: number; went: number };
  thumbUrl: string | null;
};

export type NotablePlace = {
  id: string;
  name: string;
  areaName: string | null;
  type: PlaceType;
  distanceM: number;
  description: string | null;
  thumbUrl: string | null;
};

/** Places near a point that people liked on SKOOP (friends first, then following, then everyone). */
/** A picked city covers the whole city; "near me" stays within walking/auto distance. */
const radius = (near: { slug: string }, city: number, me: number) =>
  near.slug === 'me' ? me : city;

export async function recommendedPlaces(near: {
  slug: string;
  lat: number;
  lng: number;
}): Promise<RecommendedPlace[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_recommended_places', {
    p_lat: near.lat,
    p_lng: near.lng,
    p_radius_m: radius(near, 20000, 5000),
  });
  return (data ?? []).map((r) => ({
    id: r.place_id,
    name: r.name,
    areaName: r.area_name,
    type: r.type,
    distanceM: r.distance_m,
    friends: { go: r.friend_go, went: r.friend_went },
    following: { go: r.following_go, went: r.following_went },
    everyone: { go: r.everyone_go, went: r.everyone_went },
    thumbUrl: r.thumb_url,
  }));
}

/** Well-known spots nearby (with a credited Wikimedia photo/description). */
export async function notablePlaces(near: {
  slug: string;
  lat: number;
  lng: number;
}): Promise<NotablePlace[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_notable_places', {
    p_lat: near.lat,
    p_lng: near.lng,
    p_radius_m: radius(near, 25000, 8000),
  });
  return (data ?? []).map((r) => ({
    id: r.place_id,
    name: r.name,
    areaName: r.area_name,
    type: r.type,
    distanceM: r.distance_m,
    description: r.short_description,
    thumbUrl: r.thumb_url,
  }));
}
