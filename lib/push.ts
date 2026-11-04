import 'server-only';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Web push (P7-05). Off unless both VAPID keys are configured. Payloads carry only a short
 * title/body and an in-app URL: never notes, photos or locations.
 */
export function pushEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
    process.env.VAPID_PRIVATE_KEY ?? '',
  );
  configured = true;
}

export type PushMessage = { title: string; body: string; url: string; tag?: string };

/** Send to every subscription of these users. Dead subscriptions (404/410) are removed. */
export async function pushToUsers(userIds: readonly string[], msg: PushMessage): Promise<void> {
  const ids = [...new Set(userIds)].slice(0, 200);
  if (!pushEnabled() || ids.length === 0) return;
  configure();
  const db = createAdminClient();
  const { data } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', ids);
  const payload = JSON.stringify(msg);
  await Promise.all(
    (data ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 24, urgency: 'normal' },
        );
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
      }
    }),
  );
}

/** Friends who opted in to verdict pushes and are allowed to see this visit. */
export async function pushNewVerdict(visitId: string, authorName: string, placeName: string) {
  if (!pushEnabled()) return;
  const db = createAdminClient();
  const { data } = await db.rpc('push_targets_for_visit', { p_visit: visitId });
  const ids = (data ?? []).map((r) => r.user_id);
  await pushToUsers(ids, {
    title: `${authorName} logged ${placeName}`,
    body: 'See what they said.',
    url: '/',
    tag: `visit-${visitId}`,
  });
}
