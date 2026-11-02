import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';
import type { Database } from './database.types';

/**
 * Secret-key client. BYPASSES Row Level Security.
 * Only for scripts and admin actions that have already verified the caller is an admin.
 * `server-only` makes any client-side import a build error.
 */
export function createAdminClient() {
  return createClient<Database>(
    publicEnv().NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SECRET_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
