import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { PLACE_TYPES } from '@/lib/domain/place';
import { createClient } from '@/lib/supabase/server';

const query = z.object({
  minLat: z.coerce.number().min(18).max(20),
  minLng: z.coerce.number().min(72).max(74),
  maxLat: z.coerce.number().min(18).max(20),
  maxLng: z.coerce.number().min(72).max(74),
  types: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',') : []))
    .pipe(z.array(z.enum(PLACE_TYPES)).max(PLACE_TYPES.length)),
  veg: z.enum(['0', '1']).optional(),
});

export type ExplorePlace = {
  id: string;
  name: string;
  areaName: string | null;
  lat: number;
  lng: number;
  type: (typeof PLACE_TYPES)[number];
  cuisineTags: string[];
  dietFlags: string[];
};

/**
 * Explore layer for the diary map: places in the visible area I haven't been to or saved.
 * GET (not a server action) so panning can abort stale requests. Signed-in only.
 */
export async function GET(request: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ places: [] }, { status: 400 });
  const q = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data } = await supabase.rpc('get_places_in_view', {
    p_min_lat: q.minLat,
    p_min_lng: q.minLng,
    p_max_lat: q.maxLat,
    p_max_lng: q.maxLng,
    ...(q.types.length ? { p_types: q.types } : {}),
    p_pure_veg: q.veg === '1',
  });
  const places: ExplorePlace[] = (data ?? []).map((r) => ({
    id: r.place_id,
    name: r.name,
    areaName: r.area_name,
    lat: r.lat,
    lng: r.lng,
    type: r.type,
    cuisineTags: r.cuisine_tags,
    dietFlags: r.diet_flags,
  }));
  return NextResponse.json({ places }, { headers: { 'Cache-Control': 'private, max-age=60' } });
}
