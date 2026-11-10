import Image from 'next/image';
import { copy } from '@/lib/copy';
import { describePlace } from '@/lib/domain/describe';
import type { PlaceType } from '@/lib/domain/place';
import type { GalleryPhoto, PlaceExtras } from '@/lib/data/placeMedia';

/**
 * Photos and a short description. Every borrowed piece is credited: Wikimedia photos show
 * author + licence linked to their Commons page; Wikipedia text links back with its licence.
 */
export function PlaceAbout({
  place,
  extras,
  photos,
}: {
  place: {
    type: PlaceType;
    cuisineTags: string[];
    dietFlags: string[];
    areaName: string | null;
  };
  extras: PlaceExtras;
  photos: GalleryPhoto[];
}) {
  const t = copy.placeAbout;
  const line = describePlace({ ...place, category: extras.category, city: extras.city });
  const wiki = extras.info;
  return (
    <section className="mt-4 space-y-3">
      {photos.length ? (
        <ul
          aria-label={t.photos}
          className="-mx-4 flex snap-x [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0"
        >
          {photos.map((ph, i) => (
            <li key={ph.key} className="w-[220px] shrink-0 snap-start" data-reveal="pop">
              <figure>
                <Image
                  src={ph.src}
                  alt=""
                  width={ph.width ?? 440}
                  height={ph.height ?? 330}
                  unoptimized
                  data-torn={i === 0 ? 'first' : 'more'}
                  className="aspect-[4/3] w-full rounded-[var(--radius-button)] object-cover"
                />
                {ph.credit ? (
                  <figcaption className="text-muted mt-1 line-clamp-2 text-[11px] leading-snug">
                    <a
                      href={ph.credit.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {t.photoBy(ph.credit.author, ph.credit.licence)}
                    </a>
                  </figcaption>
                ) : (
                  <figcaption className="text-muted mt-1 text-[11px]">{t.fromMember}</figcaption>
                )}
              </figure>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="border-line bg-surface rounded-[var(--radius-card)] border p-3">
        <h2 className="text-sm font-bold">{t.about}</h2>
        <p className="mt-1 text-sm">{line}</p>
        {wiki?.wikiExtract ? (
          <blockquote className="border-line text-muted mt-2 border-l-2 pl-3 text-sm">
            <p className="line-clamp-5">{wiki.wikiExtract}</p>
            {wiki.wikiUrl ? (
              <a
                href={wiki.wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary mt-1 inline-block text-xs font-semibold"
              >
                {t.fromWikipedia}
              </a>
            ) : null}
          </blockquote>
        ) : wiki?.shortDescription ? (
          <p className="text-muted mt-1 text-sm first-letter:uppercase">{wiki.shortDescription}</p>
        ) : null}
      </div>
    </section>
  );
}
