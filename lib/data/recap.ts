import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { APP_NAME } from '@/lib/config';

export type Recap = {
  year: number;
  visits: number;
  places: number;
  newPlaces: number;
  areas: number;
  go: number;
  skip: number;
  onlyFor: number;
  topAreas: { name: string; places: number }[];
  topCuisines: { name: string; places: number }[];
  favourite: { name: string; visits: number } | null;
  first: { name: string; date: string } | null;
  busiestMonth: string | null;
  byMonth: number[];
  badges: { name: string; icon: string }[];
};

type Json = Record<string, unknown>;
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0) || 0);
const list = (v: unknown) => (Array.isArray(v) ? (v as Json[]) : []);

export function toRecap(j: Json): Recap {
  const fav = j.favourite as Json | null | undefined;
  const first = j.first as Json | null | undefined;
  return {
    year: num(j.year),
    visits: num(j.visits),
    places: num(j.places),
    newPlaces: num(j.new_places),
    areas: num(j.areas),
    go: num(j.go),
    skip: num(j.skip),
    onlyFor: num(j.only_for),
    topAreas: list(j.top_areas).map((a) => ({ name: String(a.name), places: num(a.places) })),
    topCuisines: list(j.top_cuisines).map((a) => ({ name: String(a.name), places: num(a.places) })),
    favourite: fav ? { name: String(fav.name), visits: num(fav.visits) } : null,
    first: first ? { name: String(first.name), date: String(first.date) } : null,
    busiestMonth: typeof j.busiest_month === 'string' ? j.busiest_month : null,
    byMonth: Array.isArray(j.by_month) ? (j.by_month as unknown[]).map(num) : Array(12).fill(0),
    badges: list(j.badges).map((b) => ({ name: String(b.name), icon: String(b.icon ?? '🏅') })),
  };
}

/** Your year in food (P7-03). Your own data only. */
export async function myRecap(year: number): Promise<Recap | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_year_recap', { p_year: year });
  return data && typeof data === 'object' && !Array.isArray(data) ? toRecap(data as Json) : null;
}

export type ShareCard = {
  kind: 'recap' | 'badge' | 'journey';
  snapshot: Json;
  displayName: string;
};

/**
 * A public share card by token (P7-04). Read with the secret key because viewers (and the
 * WhatsApp/Instagram preview crawlers) are signed out. Only the stored snapshot is returned.
 */
export async function shareCardByToken(token: string): Promise<ShareCard | null> {
  if (!/^[A-Za-z0-9_-]{22,64}$/.test(token)) return null;
  const db = createAdminClient();
  const { data } = await db
    .from('share_cards')
    .select('kind, snapshot, revoked_at')
    .eq('token', token)
    .maybeSingle();
  if (!data || data.revoked_at) return null;
  const snap = (data.snapshot ?? {}) as Json;
  const kind = data.kind === 'badge' || data.kind === 'journey' ? data.kind : 'recap';
  return { kind, snapshot: snap, displayName: String(snap.display_name ?? `A ${APP_NAME} member`) };
}
