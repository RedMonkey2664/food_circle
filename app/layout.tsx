import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { preconnect } from 'react-dom';
import { APP_NAME, APP_TAGLINE } from '@/lib/config';
import './globals.css';

// Self-hosted at build time by next/font: no runtime request to Google, no layout shift.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz', 'SOFT'],
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fffbf5',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  // Open connections early to the origins every signed-in page uses: the database and photo
  // storage, map tiles, and Google profile pictures. Saves a DNS + TLS round trip on mobile.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) preconnect(supabaseUrl, { crossOrigin: 'anonymous' });
  preconnect('https://tiles.openfreemap.org', { crossOrigin: 'anonymous' });
  preconnect('https://lh3.googleusercontent.com');
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="bg-bg text-ink min-h-dvh antialiased">{children}</body>
    </html>
  );
}
