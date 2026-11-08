import Link from 'next/link';
import { Avatar } from '@/components/social/Avatar';
import { Card } from '@/components/ui/Card';
import { DoubleTapSave } from '@/components/interactive/DoubleTapSave';
import type { Tier } from '@/lib/domain/tiers';
import { visitAge } from '@/lib/domain/time';
import type { Verdict } from '@/lib/domain/verdict';
import { VISIBILITY_LABEL, type Visibility } from '@/lib/domain/visibility';
import type { VisitDetails } from '@/lib/data/details';
import { WantToGoButton } from '@/components/place/WantToGoButton';
import { RelationshipTag } from './RelationshipTag';
import { VerdictDetails } from './VerdictDetails';
import { VerdictLabel } from './VerdictLabel';

export type VerdictCardData = {
  visitId: string;
  verdict: Verdict;
  onlyForText: string | null;
  visitedOn: string;
  place?: { id: string; name: string; areaName: string | null };
  author?: { id?: string; username: string; displayName: string; avatarUrl: string | null };
  /** Phase 6: up to 2 of the author's badges (credibility signals), shown beside the name. */
  authorBadges?: string[];
  /** Relationship of the author to the viewer; omit on your own cards. */
  tier?: Tier;
  groupName?: string | null;
  /** Shown only on the viewer's own cards ("Only me", "Friends"...). */
  ownVisibility?: Visibility;
  /** Phase 4: note, dishes, price, photos (only what the viewer may see). */
  details?: VisitDetails;
  /** Phase 5: show "Save to Want to go" (someone else's verdict, with a place). */
  saved?: boolean;
};

/**
 * One verdict, collapsed (UI_UX.md §3). The relationship tag is always visible when the
 * author isn't you, and card weight follows trust: friend strongest, public quietest.
 */
export function VerdictCard({ data }: { data: VerdictCardData }) {
  const tone = data.tier === 'friend' ? 'friend' : data.tier === 'public' ? 'public' : 'default';
  return (
    <DoubleTapSave placeId={data.place?.id} fromVisit={data.visitId}>
      <Card tone={tone}>
        {data.author ? (
          <div className="flex items-center gap-2">
            <Link href={`/u/${data.author.username}`} className="flex min-w-0 items-center gap-2">
              <Avatar name={data.author.displayName} url={data.author.avatarUrl} size={28} />
              <span className="truncate font-semibold">{data.author.displayName}</span>
            </Link>
            {data.tier ? <RelationshipTag tier={data.tier} group={data.groupName} /> : null}
            {data.authorBadges?.length ? (
              <span className="inline-flex gap-1">
                {data.authorBadges.slice(0, 2).map((b, i) => (
                  <span
                    key={b}
                    className={`border-line text-muted rounded-[var(--radius-pill)] border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${i > 0 ? 'hidden sm:inline' : ''}`}
                  >
                    {b}
                  </span>
                ))}
              </span>
            ) : null}
            <span className="text-muted ml-auto shrink-0 text-sm">{visitAge(data.visitedOn)}</span>
          </div>
        ) : null}
        {data.place ? (
          <div className={data.author ? 'mt-1.5' : 'flex items-baseline justify-between gap-2'}>
            <Link href={`/place/${data.place.id}`} className="font-medium hover:underline">
              {data.place.name}
              {data.place.areaName ? (
                <span className="text-muted font-normal">, {data.place.areaName}</span>
              ) : null}
            </Link>
            {!data.author ? (
              <span className="text-muted shrink-0 text-sm">{visitAge(data.visitedOn)}</span>
            ) : null}
          </div>
        ) : null}
        <div className="mt-1 flex items-center justify-between gap-2">
          <VerdictLabel verdict={data.verdict} onlyForText={data.onlyForText} />
          {data.saved !== undefined && data.place && data.tier ? (
            <WantToGoButton
              placeId={data.place.id}
              initialSaved={data.saved}
              fromVisit={data.visitId}
              compact
            />
          ) : data.ownVisibility ? (
            <span className="text-muted text-xs">{VISIBILITY_LABEL[data.ownVisibility]}</span>
          ) : null}
        </div>
        {data.details ? <VerdictDetails details={data.details} /> : null}
      </Card>
    </DoubleTapSave>
  );
}
