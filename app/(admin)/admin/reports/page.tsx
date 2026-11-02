import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ActionButton } from '@/components/social/ActionButton';
import { resolveReport } from '@/lib/actions/admin';
import { requireOnboardedUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Reports (admin)' };

// Admin-only list of open reports (P1-05). Plain and functional by design (UI_UX.md §4.10).
// Access: profiles.is_admin, set by hand in the database. RLS hides reports from everyone else.
async function Reports() {
  const me = await requireOnboardedUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', me.id)
    .single();
  if (!profile?.is_admin) notFound();

  const { data: reports } = await supabase
    .from('reports')
    .select('id, target_type, target_id, reason, status, created_at, reporter_id')
    .eq('status', 'open')
    .order('created_at', { ascending: true })
    .limit(100);

  if (!reports?.length) return <p className="text-muted mt-6">No open reports.</p>;

  return (
    <ul className="mt-6 space-y-3">
      {reports.map((r) => (
        <li key={r.id} className="border-line bg-surface rounded-[var(--radius-card)] border p-4">
          <p className="text-muted text-xs">
            {r.target_type} {r.target_id} ·{' '}
            {new Date(r.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{r.reason}</p>
          <div className="mt-3 flex gap-2">
            <ActionButton
              action={resolveReport}
              fields={{ reportId: r.id, status: 'dismissed' }}
              label="Dismiss"
              variant="ghost"
            />
            <ActionButton
              action={resolveReport}
              fields={{ reportId: r.id, status: 'actioned' }}
              label="Mark actioned"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminReportsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold">Reports</h1>
      <Suspense fallback={<p className="text-muted mt-6">Loading…</p>}>
        <Reports />
      </Suspense>
    </main>
  );
}
