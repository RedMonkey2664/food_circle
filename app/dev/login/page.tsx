import { notFound } from 'next/navigation';
import { DEV_USERS, devToolsEnabled } from '@/lib/dev';
import { devSignIn } from './actions';

export const metadata = { title: 'Dev sign-in' };

// Local-only: sign in as a seed user without Google. 404s anywhere else.
export default function DevLoginPage() {
  if (!devToolsEnabled()) notFound();
  return (
    <main className="mx-auto max-w-[480px] px-4 py-8">
      <h1 className="font-display text-2xl font-semibold">Dev sign-in</h1>
      <p className="text-muted mt-1 text-sm">
        Local only. Fake seed users from supabase/seed.sql. Run <code>pnpm db:reset</code> to reset
        them.
      </p>
      <ul className="mt-6 space-y-2">
        {DEV_USERS.map((u) => (
          <li key={u.username}>
            <form action={devSignIn}>
              <input type="hidden" name="username" value={u.username} />
              <button
                type="submit"
                className="border-line bg-surface hover:border-primary flex min-h-14 w-full flex-col items-start rounded-[var(--radius-card)] border-2 px-4 py-2 text-left"
              >
                <span className="font-semibold">@{u.username}</span>
                <span className="text-muted text-sm">{u.note}</span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
