import { Suspense } from 'react';
import { AddPlaceForm } from '@/components/place/AddPlaceForm';
import { requireOnboardedUser } from '@/lib/auth';
import { copy } from '@/lib/copy';
import { PageTitle } from '@/components/brand/Sticker';

export const metadata = { title: 'Add a place' };

async function Form({ searchParams }: { searchParams: PageProps<'/add-place'>['searchParams'] }) {
  const { name } = await searchParams;
  await requireOnboardedUser();
  return <AddPlaceForm initialName={typeof name === 'string' ? name.slice(0, 120) : ''} />;
}

export default function AddPlacePage(props: PageProps<'/add-place'>) {
  return (
    <main className="pt-2">
      <PageTitle sticker="croissant" tilt={-8}>
        {copy.addPlace.title}
      </PageTitle>
      <p className="text-muted mt-1 mb-4 text-sm">{copy.addPlace.intro}</p>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="bg-line/60 h-72 animate-pulse rounded-[var(--radius-card)]"
          />
        }
      >
        <Form searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
