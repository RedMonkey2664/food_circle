import Image from 'next/image';
import Link from 'next/link';
import { foodFor, Sticker } from '@/components/brand/Sticker';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import type { ExplorePlace } from '@/lib/data/explore';
import type { RecommendedPlace } from '@/lib/data/recommend';
import { describePlace } from '@/lib/domain/describe';
import { DIET_LABEL, displayDietFlags } from '@/lib/domain/diet';
import { PLACE_TYPE_LABEL, type PlaceType } from '@/lib/domain/place';

const t = copy.discoverPlaces;

/** Paper colour behind the sticker when a place has no photo, by kind of place. */
const PAPER: Record<PlaceType, string> = {
  restaurant: 'bg-[#f8e1dc]',
  cafe: 'bg-[#f3e3c8]',
  street_stall: 'bg-[#fde7a6]',
  bakery: 'bg-[#f9dfe8]',
  sweet_shop: 'bg-[#f9dfe8]',
  bar: 'bg-[#dfe5f5]',
  attraction: 'bg-[#e6efe4]',
  other: 'bg-[#efe6d8]',
};

/** Each tier on its own pill, in its own colours: never a blended score (CLAUDE.md rule 1). */
export function TierPills({ p }: { p: RecommendedPlace }) {
  const pills: { cls: string; text: string }[] = [];
  if (p.friends.go > 0)
    pills.push({ cls: 'bg-primary-soft text-primary', text: t.friendsGo(p.friends.go) });
  if (p.following.go > 0)
    pills.push({ cls: 'bg-following-bg text-following-fg', text: t.followingGo(p.following.go) });
  if (p.everyone.go > 0)
    pills.push({
      cls: 'bg-public-bg text-public-fg',
      text: t.everyoneGo(p.everyone.go, p.everyone.went),
    });
  if (!pills.length) return null;
  return (
    <span className="mt-2 flex flex-wrap gap-1.5">
      {pills.map((x) => (
        <span key={x.text} className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', x.cls)}>
          {x.text}
        </span>
      ))}
    </span>
  );
}

/** The picture at the top of a card: a credited photo, or a food sticker on coloured paper. */
function Cover({
  name,
  type,
  src,
  priority,
}: {
  name: string;
  type: PlaceType;
  src: string | null;
  priority?: boolean;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={480}
        height={360}
        unoptimized
        priority={priority}
        className="aspect-square h-full w-full object-cover sm:aspect-[4/3] sm:h-auto"
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        'relative flex aspect-square h-full w-full items-center justify-center overflow-hidden sm:aspect-[4/3] sm:h-auto',
        PAPER[type],
      )}
      style={{
        backgroundImage: 'radial-gradient(circle, rgb(176 20 27 / 0.14) 1.1px, transparent 1.6px)',
        backgroundSize: '9px 9px',
      }}
    >
      <Sticker
        name={foodFor(name)}
        size={92}
        tilt={name.length % 2 ? 8 : -8}
        className="w-[64px]! sm:w-[92px]!"
      />
      <span className="text-muted absolute right-2.5 bottom-2 hidden text-[11px] font-medium sm:block">
        {copy.explore.noPhoto}
      </span>
    </span>
  );
}

/** One place in the Explore grid. The whole card links to the place page. */
export function ExploreCard({
  place,
  verdicts,
  priority = false,
}: {
  place: ExplorePlace;
  verdicts?: RecommendedPlace;
  priority?: boolean;
}) {
  const diet = displayDietFlags(place.dietFlags);
  return (
    <Link
      href={`/place/${place.id}`}
      data-reveal="pop"
      className="sk-card bg-surface border-line group flex h-full flex-row overflow-hidden rounded-[var(--radius-card)] border sm:flex-col"
    >
      {/* Phones: a compact row with a square thumbnail. Wider: a picture card. */}
      <span className="block w-[104px] shrink-0 overflow-hidden sm:w-auto">
        <span className="block h-full transition-[scale] duration-(--dur-enter) ease-(--ease-out) group-hover:scale-[1.04] sm:h-auto">
          <Cover name={place.name} type={place.type} src={place.thumbUrl} priority={priority} />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col p-3 sm:p-3.5">
        <span className="flex items-start justify-between gap-2">
          <span className="font-display text-base leading-snug font-semibold sm:text-lg">
            {place.name}
          </span>
          <span className="text-muted mt-1 hidden shrink-0 text-xs font-semibold tracking-wide uppercase sm:block">
            {PLACE_TYPE_LABEL[place.type]}
          </span>
        </span>
        <span className="text-muted mt-1 text-sm">
          {describePlace({
            type: place.type,
            category: place.category,
            cuisineTags: place.cuisineTags,
            dietFlags: place.dietFlags,
            areaName: place.areaName,
            city: place.city,
          })}
        </span>
        {diet.length ? (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {diet.map((d) => (
              <span
                key={d}
                className="border-veg/40 text-veg rounded-full border px-2 py-0.5 text-xs font-semibold"
              >
                {DIET_LABEL[d]}
              </span>
            ))}
          </span>
        ) : null}
        {verdicts ? <TierPills p={verdicts} /> : null}
      </span>
    </Link>
  );
}
