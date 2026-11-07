import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { APP_NAME, APP_TAGLINE } from '@/lib/config';
import { copy } from '@/lib/copy';
import { shareCardByToken } from '@/lib/data/recap';
import { cuisineLabel } from '@/lib/domain/place';
import { Brand } from '@/components/brand/Logo';

type Json = Record<string, unknown>;
const n = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0) || 0);

function describe(kind: string, s: Json, name: string): { title: string; body: string } {
  if (kind === 'badge')
    return {
      title: `${name} unlocked ${String(s.name ?? 'a badge')}`,
      body: String(s.description ?? ''),
    };
  if (kind === 'journey')
    return {
      title: `${name} is a Level ${n(s.level)} Explorer`,
      body: `${n(s.places)} places, ${n(s.badges)} badges on ${APP_NAME}.`,
    };
  return {
    title: `${name}'s ${n(s.year)} in food: ${n(s.places)} places`,
    body: `${n(s.areas)} neighbourhoods across Mumbai, logged on ${APP_NAME}.`,
  };
}

export async function generateMetadata({ params }: PageProps<'/s/[token]'>): Promise<Metadata> {
  const { token } = await params;
  const card = await shareCardByToken(token);
  if (!card) return { title: APP_NAME, robots: { index: false } };
  const d = describe(card.kind, card.snapshot, card.displayName);
  return {
    title: d.title,
    description: d.body,
    robots: { index: false, follow: false },
    openGraph: { title: d.title, description: d.body, type: 'website', siteName: APP_NAME },
    twitter: { card: 'summary_large_image', title: d.title, description: d.body },
  };
}

async function Card({ params }: { params: PageProps<'/s/[token]'>['params'] }) {
  const { token } = await params;
  const card = await shareCardByToken(token);
  if (!card) notFound();
  const s = card.snapshot;
  const d = describe(card.kind, s, card.displayName);
  const chips =
    card.kind === 'recap'
      ? [
          ...((s.top_areas as Json[] | undefined) ?? []).map((a) => `📍 ${String(a.name)}`),
          ...((s.top_cuisines as Json[] | undefined) ?? []).map(
            (c) => `🍽️ ${cuisineLabel(String(c.name))}`,
          ),
        ]
      : [];
  return (
    <>
      <section className="border-line bg-surface rounded-[var(--radius-card)] border p-6">
        {card.kind === 'badge' ? (
          <p aria-hidden className="text-6xl">
            {String(s.icon ?? '🏅')}
          </p>
        ) : null}
        <h1 className="font-display mt-2 text-3xl leading-tight font-semibold">{d.title}</h1>
        <p className="text-muted mt-2">{d.body}</p>
        {card.kind === 'recap' ? (
          <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
            {(
              [
                ['Go', n(s.go)],
                ['Skip', n(s.skip)],
                ['Only for', n(s.only_for)],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="bg-primary-soft rounded-[var(--radius-button)] py-3">
                <dd className="font-display text-2xl font-semibold">{v}</dd>
                <dt className="text-muted text-xs">{k}</dt>
              </div>
            ))}
          </dl>
        ) : null}
        {chips.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {chips.map((c) => (
              <li key={c} className="border-line rounded-full border px-3 py-1 text-sm">
                {c}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <p className="text-muted mt-6 text-center">{APP_TAGLINE}</p>
      <Link
        href="/login"
        className={buttonClass({ size: 'lg', fullWidth: true, className: 'mt-3' })}
      >
        {copy.share.join}
      </Link>
    </>
  );
}

/** Public page for a share link. Signed-out friendly; shows only the stored snapshot. */
export default function SharePage(props: PageProps<'/s/[token]'>) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-4 py-10">
      <p className="mb-4 text-xl">
        <Brand />
      </p>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="bg-line/60 h-64 animate-pulse rounded-[var(--radius-card)]"
          />
        }
      >
        <Card params={props.params} />
      </Suspense>
    </main>
  );
}
