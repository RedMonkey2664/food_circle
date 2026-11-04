import { ImageResponse } from 'next/og';
import { shareCardByToken } from '@/lib/data/recap';
import { ShareImage } from '@/lib/shareImage';

// Link preview for WhatsApp, iMessage, Instagram DMs (P7-04). 1200x630 is what they crop to.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'A Food Circle share card';

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
        Food Circle
      </div>,
      size,
    );
  }
  return new ImageResponse(<ShareImage card={card} story={false} />, { ...size, emoji: 'twemoji' });
}
