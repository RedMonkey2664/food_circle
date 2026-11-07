import { ImageResponse } from 'next/og';
import { AppMark, markDataUri } from '@/lib/icon';

// iOS home-screen icon (iOS applies its own rounding, so draw it square).
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
  return new ImageResponse(<AppMark size={180} src={await markDataUri()} safe />, size);
}
