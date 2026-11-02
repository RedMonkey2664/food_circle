import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { copy } from '@/lib/copy';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm, type AreaGroup } from './OnboardingForm';

export const metadata = { title: 'Set up your profile' };

function suggestUsername(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 20);
  return base.length >= 3 ? base : '';
}

async function loadAreas(): Promise<AreaGroup[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('areas')
    .select('id, name, kind, parent_id')
    .in('kind', ['suburb', 'region'])
    .order('name');
  const rows = data ?? [];
  const regions = rows.filter((r) => r.kind === 'region');
  const suburbs = rows.filter((r) => r.kind === 'suburb');
  const groups: AreaGroup[] = regions.map((r) => ({
    label: r.name,
    areas: suburbs.filter((s) => s.parent_id === r.id).map((s) => ({ id: s.id, name: s.name })),
  }));
  const other = suburbs.filter((s) => !regions.some((r) => r.id === s.parent_id));
  if (other.length)
    groups.push({ label: 'Other', areas: other.map((s) => ({ id: s.id, name: s.name })) });
  return groups.filter((g) => g.areas.length > 0);
}

async function Onboarding() {
  const user = await requireUser();
  if (user.onboarded) redirect('/');
  const areas = await loadAreas();
  const keepUsername = !user.username.startsWith('user_');
  return (
    <OnboardingForm
      areas={areas}
      initial={{
        username: keepUsername ? user.username : suggestUsername(user.displayName),
        displayName: user.displayName === 'New user' ? '' : user.displayName,
      }}
    />
  );
}

export default function OnboardingPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-[480px] px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-10">
      <p className="font-display text-primary text-xl font-semibold">{copy.app.name}</p>
      <h1 className="font-display mt-4 text-2xl font-semibold">{copy.onboarding.title}</h1>
      <p className="text-muted mt-2">{copy.onboarding.intro}</p>
      <Suspense
        fallback={
          <div aria-busy="true" className="mt-8 space-y-4">
            <div className="bg-line h-12 animate-pulse rounded-[var(--radius-button)]" />
            <div className="bg-line h-12 animate-pulse rounded-[var(--radius-button)]" />
          </div>
        }
      >
        <Onboarding />
      </Suspense>
    </main>
  );
}
