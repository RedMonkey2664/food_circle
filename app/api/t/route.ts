import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

// Privacy-respecting analytics sink (P7-07). Stores no user id, IP, cookie or free text other
// than a truncated error message. Event names are a fixed allow-list (see DECISIONS.md).
const EVENTS = [
  'page_view',
  'log_saved',
  'place_added',
  'share_created',
  'recap_viewed',
  'install_accepted',
  'install_dismissed',
  'push_enabled',
  'dictation_used',
] as const;

const body = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('event'),
    name: z.enum(EVENTS),
    route: z
      .string()
      .max(80)
      .regex(/^\/[A-Za-z0-9/_\-[\]]*$/)
      .optional(),
    device: z.enum(['phone', 'tablet', 'desktop']).optional(),
  }),
  z.object({
    type: z.literal('error'),
    message: z.string().min(1).max(300),
    digest: z.string().max(64).optional(),
    route: z
      .string()
      .max(80)
      .regex(/^\/[A-Za-z0-9/_\-[\]]*$/)
      .optional(),
  }),
]);

export async function POST(request: NextRequest) {
  if (Number(request.headers.get('content-length') ?? 0) > 2048) {
    return new NextResponse(null, { status: 413 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = body.safeParse(json);
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const db = createAdminClient();
  const v = parsed.data;
  if (v.type === 'event') {
    await db
      .from('app_events')
      .insert({ name: v.name, route: v.route ?? null, device: v.device ?? null });
  } else {
    // Strip anything that looks like an email, uuid or long number before storing.
    const message = v.message
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]')
      .replace(/\d{6,}/g, '[n]');
    await db.from('app_errors').insert({
      message,
      digest: v.digest ?? null,
      route: v.route ?? null,
      source: 'client',
    });
  }
  return new NextResponse(null, { status: 204 });
}
