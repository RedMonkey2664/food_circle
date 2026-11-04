import type { MetadataRoute } from 'next';
import { APP_NAME, APP_TAGLINE } from '@/lib/config';
import { BRAND_CREAM } from '@/lib/icon';

// PWA manifest (P1-12). Service worker (offline diary, push) is public/sw.js (P7-05).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_TAGLINE,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: BRAND_CREAM,
    theme_color: BRAND_CREAM,
    lang: 'en-IN',
    categories: ['food', 'social', 'lifestyle'],
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon/maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
