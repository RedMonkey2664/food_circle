import Image from 'next/image';
import Link from 'next/link';
import { CityPicker } from '@/components/place/CityPicker';
import { Card } from '@/components/ui/Card';
import { copy } from '@/lib/copy';
import { notablePlaces, recommendedPlaces, type RecommendedPlace } from '@/lib/data/recommend';
import { PLACE_TYPE_LABEL } from '@/lib/domain/place';
import { readNear } from '@/lib/near';

const t = copy.discoverPlaces;

function Thumb({ src }: { src: string | null }) {
  if (!src) return null;
  return (
    <Image
      src={src}
      alt=""
      width={160}
      height={120}
      unoptimized
      className="size-16 shrink-0 rounded-[var(--radius-button)] object-cover"
    />
  );
}

type Line = { cls: string; text: string };

/** Each tier on its own line, in its own colours: never a blended score. */
function TierLines({ p }: { p: RecommendedPlace }) {
  const lines: Line[] = [];
  if (p.friends.go > 0)
    lines.push({ cls: 'bg-primary-soft text-primary', text: t.friendsGo(p.friends.go) });
  if (p.following.go > 0) {
    lines.push({ cls: 'bg-following-bg text-following-fg', text: t.followingGo(p.following.go) });
  }
  if (p.everyone.go > 0) {
    lines.push({
      cls: 'bg-public-bg text-public-fg',
      text: t.everyoneGo(p.everyone.go, p.everyone.went),
    });
  }
  return (
    <span className="mt-1.5 flex flex-wrap gap-1.5">
      {lines.map((l) => (
        <span key={l.text} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${l.cls}`}>
          {l.text}
        </span>
      ))}
    </span>
  );
}

/** Discover > Places: worth-trying spots near your chosen city or "near me" point. */
export async function PlacesTab() {
  const near = await readNear();
  if (!near) {
    return (
      <div className="mt-4">
        <CityPicker initial={null} />
        <p className="text-muted mt-3">{t.pick}</p>
      </div>
    );
  }
  const [loved, famous] = await Promise.all([recommendedPlaces(near), notablePlaces(near)]);
  return (
    <div className="mt-4">
      <CityPicker initial={near} />

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold">{t.loved}</h2>
        <p className="text-muted text-sm">{t.lovedHint}</p>
        {loved.length === 0 ? (
          <p className="text-muted mt-3 text-sm">{t.none}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {loved.map((p) => (
              <li key={p.id}>
                <Link href={`/place/${p.id}`} className="block">
                  <Card className="flex items-center gap-3">
                    <Thumb src={p.thumbUrl} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <span className="text-muted block truncate text-sm">
                        {[p.areaName, PLACE_TYPE_LABEL[p.type], t.distance(p.distanceM)]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      <TierLines p={p} />
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {famous.length ? (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">{t.famous}</h2>
          <p className="text-muted text-sm">{t.famousHint}</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {famous.map((p) => (
              <li key={p.id}>
                <Link href={`/place/${p.id}`} className="block h-full">
                  <Card className="flex h-full items-center gap-3">
                    <Thumb src={p.thumbUrl} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <span className="text-muted block text-sm first-letter:uppercase">
                        {p.description ?? PLACE_TYPE_LABEL[p.type]}
                      </span>
                      <span className="text-muted block text-xs">{t.distance(p.distanceM)}</span>
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
