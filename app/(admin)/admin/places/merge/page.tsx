import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ActionButton } from '@/components/social/ActionButton';
import { adminMergePlaces } from '@/lib/actions/places';
import { requireOnboardedUser } from '@/lib/auth';
import { isAdmin } from '@/lib/data/diary';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Merge places (admin)' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// P5-04, PLACES_DATA.md section 7: both places side by side, a preview of what moves, confirm.
// Plain and functional (UI_UX.md 4.10). The preview reads with the secret key only after the
// admin check; the merge itself runs as the admin through merge_places (is_admin + audit).
async function Merge({
  searchParams,
}: {
  searchParams: PageProps<'/admin/places/merge'>['searchParams'];
}) {
  const me = await requireOnboardedUser();
  if (!(await isAdmin(me.id))) notFound();
  const sp = await searchParams;
  const source = typeof sp.source === 'string' && UUID_RE.test(sp.source) ? sp.source : null;
  const target = typeof sp.target === 'string' && UUID_RE.test(sp.target) ? sp.target : null;

  let preview: {
    id: string;
    name: string;
    aliases: string[];
    status: string;
    area: string | null;
    visits: number;
    users: number;
  }[] = [];
  if (source && target) {
    const db = createAdminClient();
    const { data } = await db
      .from('places')
      .select('id, name, aliases, status, area:areas(name)')
      .in('id', [source, target]);
    preview = await Promise.all(
      (data ?? []).map(async (p) => {
        const { data: v } = await db.from('visits').select('user_id').eq('place_id', p.id);
        return {
          id: p.id,
          name: p.name,
          aliases: p.aliases,
          status: p.status,
          area: p.area?.name ?? null,
          visits: v?.length ?? 0,
          users: new Set((v ?? []).map((x) => x.user_id)).size,
        };
      }),
    );
  }
  const src = preview.find((p) => p.id === source);

  return (
    <>
      <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          name="source"
          defaultValue={source ?? ''}
          placeholder="Source place id (goes away)"
          className="border-line min-h-11 rounded border px-2 font-mono text-sm"
        />
        <input
          name="target"
          defaultValue={target ?? ''}
          placeholder="Target place id (stays)"
          className="border-line min-h-11 rounded border px-2 font-mono text-sm"
        />
        <button className="bg-ink text-bg min-h-11 rounded px-4 text-sm font-semibold">
          Preview
        </button>
      </form>
      {preview.length === 2 && src ? (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[source, target].map((id) => {
              const p = preview.find((x) => x.id === id);
              if (!p) return null;
              return (
                <div key={p.id} className="border-line bg-surface rounded border p-3 text-sm">
                  <p className="text-muted text-xs">
                    {p.id === source ? 'SOURCE (merged away)' : 'TARGET (kept)'}
                  </p>
                  <p className="mt-1 font-semibold">{p.name}</p>
                  <p>
                    {p.area ?? 'no area'} · {p.status}
                  </p>
                  <p>Aliases: {p.aliases.join(', ') || 'none'}</p>
                  <p>
                    {p.visits} visits by {p.users} people
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm">
            {src.visits} visits move to the target; {src.users} people’s scores are recomputed.
          </p>
          <div className="mt-3">
            <ActionButton
              action={adminMergePlaces}
              fields={{ source: source ?? '', target: target ?? '' }}
              label="Merge"
              variant="primary"
            />
          </div>
        </>
      ) : source && target ? (
        <p className="text-skip mt-4 text-sm">One of those ids was not found.</p>
      ) : null}
    </>
  );
}

export default function AdminMergePage(props: PageProps<'/admin/places/merge'>) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Merge places</h1>
      <Suspense fallback={<p className="mt-4">Loading…</p>}>
        <Merge searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
