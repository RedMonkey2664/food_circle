import 'server-only';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';
import type { Database } from './database.types';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Uses the signed-in user's session, so Row Level Security applies.
 */
export async function createClient() {
  // Session-bound data is per request. connection() tells Cache Components not to prerender
  // this work (the Supabase client reads the clock while restoring the session).
  await connection();
  const cookieStore = await cookies();
  const env = publicEnv();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies; proxy.ts refreshes the session instead.
          }
        },
      },
    },
  );
}
