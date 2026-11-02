import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  // Dev-only component gallery: no session needed (the page itself 404s in production).
  if (process.env.NODE_ENV !== 'production' && request.nextUrl.pathname.startsWith('/dev/')) {
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  // Skip static assets, images and PWA files.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
