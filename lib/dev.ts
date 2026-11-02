// Dev-only helpers. Everything here refuses to work outside local development.

/** Seed users from supabase/seed.sql (fake, @example.test). */
export const DEV_USERS = [
  { username: 'asha', note: 'Main test user. Friend of Bilal, followed by Chitra, blocked Zoya.' },
  { username: 'bilal', note: 'Friend of Asha and Priya.' },
  { username: 'chitra', note: 'Follows Asha and Priya.' },
  { username: 'dev', note: 'Pending follow request to Priya.' },
  { username: 'priya', note: 'Private account.' },
  { username: 'sam', note: 'Stranger to everyone.' },
  { username: 'zoya', note: 'Blocked by Asha.' },
  { username: 'neha', note: 'Not onboarded yet (tests onboarding).' },
] as const;

/** Local test password from supabase/seed.sql. Only ever valid against the local stack. */
export const DEV_PASSWORD = 'foodcircle-dev';

/** True only in `next dev` against a Supabase running on this machine. */
export function devToolsEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  try {
    const host = new URL(url).hostname;
    return host === '127.0.0.1' || host === 'localhost';
  } catch {
    return false;
  }
}
