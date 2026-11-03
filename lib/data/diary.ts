import 'server-only';
import type { MapPin } from '@/components/map/MapView';
import type { VerdictCardData } from '@/components/verdict/VerdictCard';
import { withDetails } from '@/lib/data/details';
import { parseCursor } from '@/lib/data/feed';
import { VISIBILITIES, type Visibility } from '@/lib/domain/visibility';
import { createClient } from '@/lib/supabase/server';

const PAGE = 20;
const isVisibility = (v: string): v is Visibility => (VISIBILITIES as readonly string[]).includes(v);

/** My visits, newest first (P5-06 timeline). Cursor = "<logged_at>_<id>". */
export async function myTimeline(
  userId: string,
  cursorRaw?: string,
): Promise<{ items: VerdictCardData[]; nextCursor: string | null }> {
  const cursor = parseCursor(cursorRaw);
  const supabase = await createClient();
  let q = supabase
    .from('visits')
    .select('id, verdict, only_for_text, visited_on, logged_at, visibility, is_backdated, place:places(id, name, area:areas(name))')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE + 1);
  if (cursor) q = q.or(`logged_at.lt.${cursor.ts},and(logged_at.eq.${cursor.ts},id.lt.${cursor.id})`);
  const { data } = await q;
  const rows = data ?? [];
  const page = rows.slice(0, PAGE);
  const last = page[page.length - 1];
  const items: VerdictCardData[] = page.flatMap((r) =>
    r.place
      ? [
          {
            visitId: r.id,
            verdict: r.verdict,
            onlyForText: r.only_for_text,
            visitedOn: r.visited_on,
            place: { id: r.place.id, name: r.place.name, areaName: r.place.area?.name ?? null },
            ...(isVisibility(r.visibility) ? { ownVisibility: r.visibility } : {}),
          },
        ]
      : [],
  );
  return {
    items: await withDetails(items),
    nextCursor: rows.length > PAGE && last ? `${last.logged_at}_${last.id}` : null,
  };
}

/** Been and Want to go pins for my map. */
export async function myMapPins(): Promise<MapPin[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_my_map');
  return (data ?? []).map((r) => ({
    id: `${r.kind}-${r.place_id}`,
    lat: r.lat,
    lng: r.lng,
    kind: r.kind === 'want' ? 'want' : 'been',
    name: r.name,
    subtitle: r.area_name ?? undefined,
    href: `/place/${r.place_id}`,
  }));
}

export type OnThisDay = { visitId: string; placeId: string; placeName: string; verdict: 'go' | 'skip' | 'only_for'; yearsAgo: number };

export async function onThisDay(): Promise<OnThisDay[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_on_this_day');
  return (data ?? []).map((r) => ({
    visitId: r.visit_id,
    placeId: r.place_id,
    placeName: r.place_name,
    verdict: r.verdict,
    yearsAgo: r.years_ago,
  }));
}

export type Logbook = {
  total: number;
  areasCovered: number;
  byArea: { label: string; places: number }[];
  byCuisine: { label: string; places: number }[];
};

export async function myLogbook(): Promise<Logbook> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_my_logbook');
  const rows = data ?? [];
  const one = (k: string) => rows.find((r) => r.kind === k)?.places ?? 0;
  return {
    total: one('total'),
    areasCovered: one('areas_covered'),
    byArea: rows.filter((r) => r.kind === 'area').map((r) => ({ label: r.label, places: r.places })),
    byCuisine: rows.filter((r) => r.kind === 'cuisine').map((r) => ({ label: r.label, places: r.places })),
  };
}

export type CompanionTag = {
  visitId: string;
  placeId: string;
  placeName: string;
  visitedOn: string;
  byName: string;
};

export async function myCompanionTags(): Promise<CompanionTag[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_my_companion_tags');
  return (data ?? []).map((r) => ({
    visitId: r.visit_id,
    placeId: r.place_id,
    placeName: r.place_name,
    visitedOn: r.visited_on,
    byName: r.by_display_name,
  }));
}

/** Place ids on my Want to go list (to show the saved state on buttons). */
export async function myWantToGoIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from('want_to_go').select('place_id').limit(500);
  return new Set((data ?? []).map((r) => r.place_id));
}

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
  return Boolean(data?.is_admin);
}
