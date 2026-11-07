import { ImageResponse } from 'next/og';
import { AppMark, markDataUri } from '@/lib/icon';

// Generated at build time: /icon/32 (tab), /icon/192 and /icon/512 (install), /icon/maskable.
export function generateImageMetadata() {
  return [
    { id: '32', size: { width: 32, height: 32 }, contentType: 'image/png' },
    { id: '192', size: { width: 192, height: 192 }, contentType: 'image/png' },
    { id: '512', size: { width: 512, height: 512 }, contentType: 'image/png' },
    { id: 'maskable', size: { width: 512, height: 512 }, contentType: 'image/png' },
  ];
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const which = await id;
  const size = which === '32' ? 32 : which === '192' ? 192 : 512;
  const src = await markDataUri();
  return new ImageResponse(<AppMark size={size} src={src} safe={which === 'maskable'} />, {
    width: size,
    height: size,
  });
}
