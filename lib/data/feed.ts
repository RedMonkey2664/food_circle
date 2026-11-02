import 'server-only';
import type { VerdictCardData } from '@/components/verdict/VerdictCard';
import { tierFromNumber } from '@/lib/domain/tiers';
import { createClient } from '@/lib/supabase/server';

export type FeedTab = 'friends' | 'following';
export type FeedPage = { items: VerdictCardData[]; nextCursor: string | null };

const PAGE = 20;

/** Cursor is "<logged_at ISO>_<visit id>" so pages never skip or repeat rows. */
export function parseCursor(raw: string | undefined): { ts: string; id: string } | null {
  if (!raw) return null;
  const i = raw.lastIndexOf('_');
  if (i < 0) return null;
  const ts = raw.slice(0, i);
  const id = raw.slice(i + 1);
  if (Number.isNaN(Date.parse(ts)) || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return { ts, id };
}

export async function homeFeed(tab: FeedTab, cursorRaw?: string): Promise<FeedPage> {
  const cursor = parseCursor(cursorRaw);
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_home_feed', {
    p_tab: tab,
    p_limit: PAGE + 1,
    ...(cursor ? { p_cursor_ts: cursor.ts, p_cursor_id: cursor.id } : {}),
  });
  const rows = data ?? [];
  const page = rows.slice(0, PAGE);
  const last = page[page.length - 1];
  return {
    items: page.map((r) => ({
      visitId: r.visit_id,
      verdict: r.verdict,
      onlyForText: r.only_for_text,
      visitedOn: r.visited_on,
      place: { id: r.place_id, name: r.place_name, areaName: r.area_name },
      author: { username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url },
      tier: tierFromNumber(r.tier) ?? undefined,
    })),
    nextCursor: rows.length > PAGE && last ? `${last.logged_at}_${last.visit_id}` : null,
  };
}
