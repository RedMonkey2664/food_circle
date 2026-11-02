import Link from 'next/link';
import { copy } from '@/lib/copy';
import type { PlaceSearchResult } from '@/lib/data/places';
import { PLACE_TYPE_LABEL } from '@/lib/domain/place';
import { DietBadges } from './DietBadges';

/** Search results list. `hrefFor` decides where a tap goes (place page, or the log sheet). */
export function PlaceSearchResults({
  results,
  hrefFor,
}: {
  results: PlaceSearchResult[];
  hrefFor: (id: string) => string;
}) {
  if (results.length === 0)
    return <p className="text-muted mt-4 text-sm">{copy.search.noResults}</p>;
  return (
    <ul className="divide-line mt-2 divide-y">
      {results.map((r) => (
        <li key={r.id}>
          <Link href={hrefFor(r.id)} className="flex min-h-14 flex-col justify-center gap-1 py-3">
            <span className="font-semibold">{r.name}</span>
            <span className="text-muted text-sm">
              {[r.areaName, PLACE_TYPE_LABEL[r.type]].filter(Boolean).join(', ')}
            </span>
            {r.dietFlags.length > 0 ? <DietBadges flags={r.dietFlags} /> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
