import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Revisiting a page within 30 s (tabs, back/forward) is instant from the router cache.
    // Server actions call revalidatePath after every change, which clears it, so you never
    // see your own stale data.
    staleTimes: { dynamic: 30, static: 300 },
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
