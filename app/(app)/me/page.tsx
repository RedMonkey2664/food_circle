import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { requireOnboardedUser } from '@/lib/auth';

async function GoToMyProfile(): Promise<null> {
  const me = await requireOnboardedUser();
  redirect(`/u/${me.username}`);
}

// Bottom-nav "Me" entry: your own profile.
export default function MePage() {
  return (
    <Suspense fallback={<div aria-busy="true" />}>
      <GoToMyProfile />
    </Suspense>
  );
}
