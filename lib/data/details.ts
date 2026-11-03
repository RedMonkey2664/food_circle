import 'server-only';
import { badgesFor } from '@/lib/data/competition';
import { createClient } from '@/lib/supabase/server';

export type VisitPhoto = { path: string; url: string };
export type VisitDetails = {
  note: string | null;
  pricePerHead: number | null;
  occasions: string[];
  dishes: { name: string; verdict: 'go' | 'skip' }[];
  photos: VisitPhoto[];
};

const SIGNED_URL_SECONDS = 60 * 60;

/**
 * Review layer for a batch of visits, only what the viewer may see (RLS). Photos get
 * short-lived signed URLs created with the viewer's session (never public bucket URLs).
 */
export async function visitDetails(visitIds: readonly string[]): Promise<Map<string, VisitDetails>> {
  const ids = [...new Set(visitIds)].slice(0, 100);
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_visit_details', { p_visits: ids });
  const rows = data ?? [];
  const paths = rows.flatMap((r) => r.photo_paths);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from('review-photos')
      .createSignedUrls(paths, SIGNED_URL_SECONDS);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return new Map(
    rows.map((r) => [
      r.visit_id,
      {
        note: r.note,
        pricePerHead: r.price_per_head,
        occasions: r.occasion_tags,
        dishes: (Array.isArray(r.dishes) ? r.dishes : []).flatMap((d) =>
          d && typeof d === 'object' && !Array.isArray(d) && typeof d.name === 'string'
            ? [{ name: d.name, verdict: d.verdict === 'skip' ? ('skip' as const) : ('go' as const) }]
            : [],
        ),
        photos: r.photo_paths.flatMap((p) => {
          const url = urls.get(p);
          return url ? [{ path: p, url }] : [];
        }),
      },
    ]),
  );
}

/** Attach details to verdict cards in one round trip. */
export async function withDetails<T extends { visitId: string }>(
  items: T[],
): Promise<(T & { details?: VisitDetails })[]> {
  const map = await visitDetails(items.map((i) => i.visitId));
  return items.map((i) => {
    const d = map.get(i.visitId);
    return d ? { ...i, details: d } : i;
  });
}

export type TopDish = { name: string; go: number; skip: number };

/** Top dishes per tier for a place (P4-05). Tier numbers as in the summary (1, 2, 3). */
export async function placeTopDishes(placeId: string): Promise<Map<number, TopDish[]>> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_place_top_dishes', { p_place: placeId });
  const out = new Map<number, TopDish[]>();
  for (const r of data ?? []) {
    const list = out.get(r.tier) ?? [];
    list.push({ name: r.name, go: r.go_count, skip: r.skip_count });
    out.set(r.tier, list);
  }
  return out;
}

/** Phase 6: attach up to 2 badge names per author (cards that carry author.id). */
export async function withAuthorBadges<T extends { author?: { id?: string } }>(
  items: T[],
): Promise<(T & { authorBadges?: string[] })[]> {
  const ids = items.flatMap((i) => (i.author?.id ? [i.author.id] : []));
  if (ids.length === 0) return items;
  const map = await badgesFor(ids);
  return items.map((i) => {
    const b = i.author?.id ? map.get(i.author.id) : undefined;
    return b?.length ? { ...i, authorBadges: b } : i;
  });
}
