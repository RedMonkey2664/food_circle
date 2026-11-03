import Link from 'next/link';
import { Suspense } from 'react';
import { requireOnboardedUser } from '@/lib/auth';
import { copy } from '@/lib/copy';
import { myGroups } from '@/lib/data/groups';
import { CreateGroupForm } from './CreateGroupForm';

export const metadata = { title: 'Groups' };

async function GroupsList() {
  await requireOnboardedUser();
  const groups = await myGroups();
  const t = copy.groups;
  return (
    <>
      {groups.length === 0 ? (
        <div className="mt-4">
          <p className="font-semibold">{t.emptyTitle}</p>
          <p className="text-muted mt-1 text-sm">{t.emptyBody}</p>
        </div>
      ) : (
        <ul className="divide-line border-line bg-surface mt-4 divide-y rounded-[var(--radius-card)] border px-4">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/groups/${g.id}`}
                className="flex min-h-16 items-center justify-between gap-3 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{g.name}</span>
                  <span className="text-muted block text-sm">
                    {[t.kinds[g.kind], t.members(g.memberCount), g.isOwner ? t.owner : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span aria-hidden className="text-muted">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <h2 className="font-display mt-8 text-lg font-semibold">{t.create}</h2>
      <div className="mt-2">
        <CreateGroupForm />
      </div>
    </>
  );
}

export default function GroupsPage() {
  return (
    <main className="pt-2">
      <h1 className="font-display text-2xl font-semibold">{copy.groups.title}</h1>
      <p className="text-muted mt-1 text-sm">{copy.groups.intro}</p>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="bg-line/60 mt-4 h-40 animate-pulse rounded-[var(--radius-card)]"
          />
        }
      >
        <GroupsList />
      </Suspense>
    </main>
  );
}
