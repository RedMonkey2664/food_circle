import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Nightly taste-match refresh (P2-03). Vercel Cron calls this with
 * `Authorization: Bearer $CRON_SECRET`; without the secret configured it refuses everything.
 */
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { data, error } = await createAdminClient().rpc('refresh_all_taste_matches');
  if (error) {
    console.error('refresh_all_taste_matches failed', error.message);
    return NextResponse.json({ error: 'refresh_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, refreshed: data });
}
