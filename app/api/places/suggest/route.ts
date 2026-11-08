import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { searchPlaces } from '@/lib/data/places';
import { readNear } from '@/lib/near';
import { createClient } from '@/lib/supabase/server';

const querySchema = z.string().trim().min(2).max(80);

/**
 * Search-as-you-type suggestions. A GET route (not a server action) so keystrokes don't queue
 * behind each other; the client aborts stale requests. Signed-in users only (RPC is
 * authenticated-only anyway).
 */
export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(request.nextUrl.searchParams.get('q') ?? '');
  if (!parsed.success) return NextResponse.json({ results: [] });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const results = await searchPlaces(parsed.data, 8, await readNear());
  return NextResponse.json({ results }, { headers: { 'Cache-Control': 'private, max-age=60' } });
}
