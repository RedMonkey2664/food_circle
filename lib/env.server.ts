import 'server-only';
import { z } from 'zod';

// Server-only env. Importing this file from a Client Component fails the build.
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export function serverEnv(): z.infer<typeof serverSchema> {
  const parsed = serverSchema.safeParse({ SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY });
  if (!parsed.success) {
    throw new Error(
      'SUPABASE_SECRET_KEY is missing. It belongs in .env.local / Vercel env, never NEXT_PUBLIC_.',
    );
  }
  return parsed.data;
}
