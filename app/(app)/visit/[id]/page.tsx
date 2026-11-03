import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ReviewEditor } from '@/components/review/ReviewEditor';
import { VerdictLabel } from '@/components/verdict/VerdictLabel';
import { requireOnboardedUser } from '@/lib/auth';
import { copy } from '@/lib/copy';
import { visitDetails } from '@/lib/data/details';
import { OCCASIONS, type Occasion } from '@/lib/domain/review';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Your review' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isOccasion = (o: string): o is Occasion => (OCCASIONS as readonly string[]).includes(o);

/** "Add more" for one of your own visits (P4-02, P4-06). */
async function VisitEditor({ params }: { params: PageProps<'/visit/[id]'>['params'] }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const me = await requireOnboardedUser();
  const supabase = await createClient();
  const { data: visit } = await supabase
    .from('visits')
    .select('id, user_id, verdict, only_for_text, place:places(id, name)')
    .eq('id', id)
    .eq('user_id', me.id)
    .maybeSingle();
  if (!visit?.place) notFound();
  const details = (await visitDetails([id])).get(id);

  return (
    <>
      <Link href={`/place/${visit.place.id}`} className="text-primary text-sm font-semibold">
        ‹ {visit.place.name}
      </Link>
      <h1 className="font-display mt-2 text-2xl font-semibold">{copy.review.editTitle}</h1>
      <p className="mt-1">
        <VerdictLabel verdict={visit.verdict} onlyForText={visit.only_for_text} />
      </p>
      <p className="text-muted mt-1 text-sm">{copy.review.editIntro}</p>
      <div className="border-line bg-surface mt-5 rounded-[var(--radius-card)] border p-4 md:p-6">
        <ReviewEditor
          visitId={id}
          userId={me.id}
          placeId={visit.place.id}
          initial={{
            note: details?.note ?? '',
            pricePerHead: details?.pricePerHead ?? null,
            occasions: (details?.occasions ?? []).filter(isOccasion),
            dishes: details?.dishes ?? [],
            photos: details?.photos ?? [],
            hasReview: Boolean(details),
          }}
        />
      </div>
    </>
  );
}

export default function VisitPage(props: PageProps<'/visit/[id]'>) {
  return (
    <main className="mx-auto w-full pt-2 lg:max-w-2xl">
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="bg-line/60 h-96 animate-pulse rounded-[var(--radius-card)]"
          />
        }
      >
        <VisitEditor params={props.params} />
      </Suspense>
    </main>
  );
}
