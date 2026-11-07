import { ImageResponse } from 'next/og';
import { shareCardByToken } from '@/lib/data/recap';
import { markDataUri } from '@/lib/icon';
import { ShareImage } from '@/lib/shareImage';
import { APP_NAME } from '@/lib/config';

// Link preview for WhatsApp, iMessage, Instagram DMs (P7-04). 1200x630 is what they crop to.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = `A ${APP_NAME} share card`;

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await shareCardByToken(token);
  if (!card) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fffbf5',
          fontSize: 56,
        }}
      >
        {APP_NAME}
      </div>,
      size,
    );
  }
  return new ImageResponse(<ShareImage card={card} story={false} mark={await markDataUri()} />, {
    ...size,
    emoji: 'twemoji',
  });
}
