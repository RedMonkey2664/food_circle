import type { VisitDetails } from '@/lib/data/details';
import { copy } from '@/lib/copy';
import { OCCASION_LABEL, OCCASIONS, priceLabel, type Occasion } from '@/lib/domain/review';

const isOccasion = (o: string): o is Occasion => (OCCASIONS as readonly string[]).includes(o);

/**
 * P4-04: a verdict card's optional depth, collapsed behind one tap. Native <details>, so it
 * works without JavaScript and costs nothing until opened.
 */
export function VerdictDetails({ details }: { details: VisitDetails }) {
  const t = copy.review;
  const goDishes = details.dishes.filter((d) => d.verdict === 'go');
  const preview = [
    goDishes.length ? `${t.bestDish}: ${goDishes.map((d) => d.name).join(', ')}` : null,
    details.photos.length
      ? `${details.photos.length} photo${details.photos.length === 1 ? '' : 's'}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <details className="group mt-2">
      <summary className="text-primary flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">{t.more}</span>
        <span className="hidden group-open:inline">{t.less}</span>
        {preview ? (
          <span className="text-muted truncate font-normal group-open:hidden">· {preview}</span>
        ) : null}
      </summary>
      <div className="space-y-3 pb-1">
        {details.note ? <p className="text-sm whitespace-pre-line">{details.note}</p> : null}
        {details.dishes.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {details.dishes.map((d) => (
              <li
                key={d.name}
                className={
                  d.verdict === 'go'
                    ? 'bg-go-soft text-go rounded-full px-2.5 py-1 text-xs font-semibold'
                    : 'bg-skip-soft text-skip rounded-full px-2.5 py-1 text-xs font-semibold'
                }
              >
                {d.name} · {d.verdict === 'go' ? 'Go' : 'Skip'}
              </li>
            ))}
          </ul>
        ) : null}
        {details.pricePerHead !== null || details.occasions.length ? (
          <p className="text-muted text-sm">
            {[
              details.pricePerHead !== null ? priceLabel(details.pricePerHead) : null,
              ...details.occasions.filter(isOccasion).map((o) => OCCASION_LABEL[o]),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
        {details.photos.length ? (
          <ul className="grid grid-cols-3 gap-1.5">
            {details.photos.map((p) => (
              <li
                key={p.path}
                className="aspect-square overflow-hidden rounded-[var(--radius-button)]"
              >
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URLs */}
                  <img
                    src={p.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="bg-line/60 size-full object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
