import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';
import { shareCardByToken } from '@/lib/data/recap';
import { markDataUri } from '@/lib/icon';
import { ShareImage } from '@/lib/shareImage';

/** 1080x1920 image for Instagram / WhatsApp status (P7-04). Same snapshot as the link card. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await shareCardByToken(token);
  if (!card) return new Response('Not found', { status: 404 });
  const res = new ImageResponse(<ShareImage card={card} story mark={await markDataUri()} />, {
    width: 1080,
    height: 1920,
    emoji: 'twemoji',
  });
  res.headers.set('Content-Disposition', 'inline; filename="skoop-story.png"');
  res.headers.set('Cache-Control', 'public, max-age=3600');
  return res;
}
