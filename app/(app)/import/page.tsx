import { Suspense } from 'react';
import { PageTitle } from '@/components/brand/Sticker';
import { ImportFlow } from '@/components/takeout/ImportFlow';
import { requireOnboardedUser } from '@/lib/auth';
import { copy } from '@/lib/copy';
import { profileStats } from '@/lib/data/profile';

export const metadata = { title: 'Import from Google Maps' };

async function Flow() {
  const me = await requireOnboardedUser();
  const stats = await profileStats(me.id);
  return (
    <ImportFlow
      isPrivateAccount={me.isPrivate}
      counts={{ friends: stats.friends, followers: stats.followers }}
    />
  );
}

export default function ImportPage() {
  return (
    <main className="mx-auto w-full pt-2 lg:max-w-2xl">
      <PageTitle sticker="camera-hand" tilt={8}>
        {copy.takeout.title}
      </PageTitle>
      <p className="text-muted mt-3">{copy.takeout.intro}</p>
      <Suspense
        fallback={
          <div className="bg-line/60 mt-5 h-48 animate-pulse rounded-[var(--radius-card)]" />
        }
      >
        <Flow />
      </Suspense>
    </main>
  );
}
