import 'server-only';
import type { ExploreFilters } from '@/lib/domain/explore';
import { EXPLORE_PAGE_SIZE, EXPLORE_TYPES } from '@/lib/domain/explore';
import { normalizeName } from '@/lib/domain/normalize';
import type { PlaceType } from '@/lib/domain/place';
import { createClient } from '@/lib/supabase/server';

export type ExplorePlace = {
  id: string;
  name: string;
  type: PlaceType;
  category: string | null;
  cuisineTags: string[];
  dietFlags: string[];
  areaName: string | null;
  city: string | null;
  /** A credited Wikimedia photo, when the place has one. */
  thumbUrl: string | null;
};

/**
 * One page of food places in a city, filtered. Reads the places table directly (readable by
 * every signed-in user under RLS) with its area and first photo. Order is by id, which is
 * random but stable, so the grid is a fair mix rather than A-to-Z, and pages never overlap.
 */
export async function explorePlaces(
  city: string,
  f: ExploreFilters,
): Promise<{ places: ExplorePlace[]; more: boolean }> {
  const supabase = await createClient();
  let query = supabase
    .from('places')
    .select(
      'id, name, type, category, cuisine_tags, diet_flags, city, area:areas(name), media:place_media(thumb_url, position)',
    )
    .eq('city', city)
    .not('status', 'in', '(merged,closed)')
    .in('type', f.type ? [f.type] : [...EXPLORE_TYPES]);
  if (f.cuisine) query = query.contains('cuisine_tags', [f.cuisine]);
  if (f.veg) query = query.contains('diet_flags', ['pure_veg']);
  if (f.q) {
    const nq = normalizeName(f.q).replace(/[%_\\]/g, '');
    if (nq) query = query.ilike('name_normalized', `%${nq}%`);
  }
  const from = (f.page - 1) * EXPLORE_PAGE_SIZE;
  const { data, error } = await query
    .order('id')
    .order('position', { referencedTable: 'place_media' })
    .limit(1, { referencedTable: 'place_media' })
    .range(from, from + EXPLORE_PAGE_SIZE); // one extra row tells us if there is a next page
  if (error || !data) return { places: [], more: false };
  const rows = data.slice(0, EXPLORE_PAGE_SIZE);
  return {
    more: data.length > EXPLORE_PAGE_SIZE,
    places: rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      category: r.category,
      cuisineTags: r.cuisine_tags,
      dietFlags: r.diet_flags,
      areaName: r.area?.name ?? null,
      city: r.city,
      thumbUrl: r.media?.[0]?.thumb_url ?? null,
    })),
  };
}
