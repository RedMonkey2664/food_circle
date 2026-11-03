import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ActionButton } from '@/components/social/ActionButton';
import { adminResolveSuggestion } from '@/lib/actions/places';
import { requireOnboardedUser } from '@/lib/auth';
import { isAdmin } from '@/lib/data/diary';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Place suggestions (admin)' };

// P5-05: apply or dismiss "closed / moved / suggest" reports. RLS shows open suggestions to admins.
async function Suggestions() {
  const me = await requireOnboardedUser();
  if (!(await isAdmin(me.id))) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from('place_suggestions')
    .select('id, field, value, created_at, place:places(id, name)')
    .eq('status', 'open')
    .order('created_at')
    .limit(100);
  if (!data?.length) return <p className="text-muted mt-6">No open suggestions.</p>;
  return (
    <ul className="mt-6 space-y-3">
      {data.map((s) => (
        <li key={s.id} className="border-line bg-surface rounded border p-4 text-sm">
          <p>
            {s.place ? (
              <Link href={`/place/${s.place.id}`} className="font-semibold underline">
                {s.place.name}
              </Link>
            ) : (
              'Unknown place'
            )}{' '}
            · <span className="font-mono">{s.field}</span> ={' '}
            <span className="font-mono">{JSON.stringify(s.value)}</span>
          </p>
          <p className="text-muted text-xs">
            {new Date(s.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            {s.field === 'moved' ? ' · move the pin by hand, then mark applied' : ''}
          </p>
          <div className="mt-2 flex gap-2">
            <ActionButton
              action={adminResolveSuggestion}
              fields={{ id: s.id, apply: '0' }}
              label="Dismiss"
              variant="ghost"
            />
            <ActionButton
              action={adminResolveSuggestion}
              fields={{ id: s.id, apply: '1' }}
              label="Apply"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminSuggestionsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Place suggestions</h1>
      <Suspense fallback={<p className="mt-4">Loading…</p>}>
        <Suggestions />
      </Suspense>
    </main>
  );
}
