import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { MemoryEditor } from '@/components/review/MemoryEditor';
import { ReviewEditor } from '@/components/review/ReviewEditor';
import { VerdictLabel } from '@/components/verdict/VerdictLabel';
import { requireOnboardedUser } from '@/lib/auth';
import { copy } from '@/lib/copy';
import { visitDetails } from '@/lib/data/details';
import { myGraph, peopleById } from '@/lib/data/social';
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
  const [detailsMap, memoryRes, companionsRes, memPhotosRes, graph] = await Promise.all([
    visitDetails([id]),
    supabase
      .from('memories')
      .select('private_note, mood, occasion, visibility')
      .eq('visit_id', id)
      .maybeSingle(),
    supabase.from('visit_companions').select('user_id').eq('visit_id', id),
    supabase
      .from('visit_photos')
      .select('storage_path')
      .eq('visit_id', id)
      .eq('kind', 'memory')
      .order('position'),
    myGraph(),
  ]);
  const details = detailsMap.get(id);
  const memory = memoryRes.data;
  const memPaths = (memPhotosRes.data ?? []).map((p) => p.storage_path);
  const signed = memPaths.length
    ? ((await supabase.storage.from('review-photos').createSignedUrls(memPaths, 3600)).data ?? [])
    : [];
  const memPhotos = signed.flatMap((s) =>
    s.path && s.signedUrl ? [{ path: s.path, url: s.signedUrl }] : [],
  );
  const friendIds = graph.friendships
    .filter((f) => f.status === 'accepted')
    .map((f) => (f.user_low === me.id ? f.user_high : f.user_low));
  const friends = [...(await peopleById(friendIds)).values()].map((p) => ({
    id: p.id,
    name: p.displayName,
  }));

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

      <section className="border-line bg-surface mt-6 rounded-[var(--radius-card)] border p-4 md:p-6">
        <h2 className="font-display text-xl font-semibold">{copy.memory.title}</h2>
        <p className="text-muted mt-1 mb-4 text-sm">{copy.memory.intro}</p>
        <MemoryEditor
          visitId={id}
          userId={me.id}
          friends={friends}
          initial={{
            privateNote: memory?.private_note ?? '',
            mood: memory?.mood ?? '',
            occasion: memory?.occasion ?? '',
            visibility: memory?.visibility === 'friends' ? 'friends' : 'private',
            companions: (companionsRes.data ?? []).map((c) => c.user_id),
            photos: memPhotos,
          }}
        />
      </section>
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
