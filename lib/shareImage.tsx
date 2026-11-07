import type { ShareCard } from '@/lib/data/recap';
import { cuisineLabel } from '@/lib/domain/place';
import { APP_NAME } from '@/lib/config';
import { BRAND_CREAM, BRAND_ORANGE } from '@/lib/icon';

const INK = '#1f1b16';
const MUTED = '#6b6259';
const SOFT = '#fdebdf';

type Json = Record<string, unknown>;
const n = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0) || 0);

/**
 * The image for a share card (P7-04), for next/og ImageResponse. `story` = 1080x1920 for
 * Instagram/WhatsApp status; otherwise 1200x630 for link previews. Text only from the snapshot.
 */
export function ShareImage({
  card,
  story,
  mark,
}: {
  card: ShareCard;
  story: boolean;
  /** The SKOOP mark as a data URI (markDataUri). */
  mark: string;
}) {
  const s = card.snapshot;
  const big = story ? 1 : 0.62;
  const pad = story ? 96 : 64;

  let eyebrow = '';
  let headline = '';
  let sub = '';
  let stats: [string, string][] = [];
  let chips: string[] = [];
  let emoji = '';

  if (card.kind === 'recap') {
    eyebrow = `${card.displayName}'s ${n(s.year)} in food`;
    headline = `${n(s.places)} places`;
    sub = `${n(s.areas)} neighbourhoods · ${n(s.visits)} meals logged`;
    stats = [
      ['Go', String(n(s.go))],
      ['Skip', String(n(s.skip))],
      ['Only for', String(n(s.only_for))],
    ];
    chips = [
      ...((s.top_areas as Json[] | undefined) ?? []).map((a) => `📍 ${String(a.name)}`),
      ...((s.top_cuisines as Json[] | undefined) ?? []).map(
        (c) => `🍽️ ${cuisineLabel(String(c.name))}`,
      ),
    ].slice(0, story ? 6 : 4);
    if (typeof s.busiest_month === 'string') chips.push(`🔥 Hungriest in ${s.busiest_month}`);
    emoji = '🗓️';
  } else if (card.kind === 'badge') {
    eyebrow = `${card.displayName} unlocked`;
    headline = String(s.name ?? 'A badge');
    sub = String(s.description ?? '');
    emoji = String(s.icon ?? '🏅');
  } else {
    eyebrow = `${card.displayName}'s food journey`;
    headline = `Level ${n(s.level)} Explorer`;
    sub = `${n(s.places)} places explored · ${n(s.badges)} badges`;
    emoji = '🧭';
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: BRAND_CREAM,
        padding: pad,
        color: INK,
        fontFamily: 'serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img> */}
        <img src={mark} width={story ? 96 : 68} height={story ? 96 : 68} alt="" />
        <div style={{ fontSize: 40 * big + 8, fontWeight: 700, color: BRAND_ORANGE }}>
          {APP_NAME}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 * big + 6 }}>
        <div style={{ fontSize: 140 * big + 20 }}>{emoji}</div>
        <div style={{ fontSize: 44 * big + 8, color: MUTED }}>{eyebrow}</div>
        <div style={{ fontSize: 120 * big + 14, fontWeight: 700, lineHeight: 1.05 }}>
          {headline}
        </div>
        {sub ? (
          <div style={{ fontSize: 46 * big + 6, color: MUTED, lineHeight: 1.3 }}>{sub}</div>
        ) : null}
        {stats.length ? (
          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            {stats.map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: SOFT,
                  borderRadius: 28,
                  padding: `${20 * big + 6}px ${32 * big + 8}px`,
                }}
              >
                <div style={{ fontSize: 72 * big + 10, fontWeight: 700 }}>{value}</div>
                <div style={{ fontSize: 32 * big + 6, color: MUTED }}>{label}</div>
              </div>
            ))}
          </div>
        ) : null}
        {chips.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {chips.map((c) => (
              <div
                key={c}
                style={{
                  fontSize: 34 * big + 6,
                  background: '#ffffff',
                  border: `2px solid ${SOFT}`,
                  borderRadius: 999,
                  padding: `${10 * big + 4}px ${24 * big + 6}px`,
                }}
              >
                {c}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ fontSize: 32 * big + 6, color: MUTED }}>
        Food verdicts from people you know · Mumbai
      </div>
    </div>
  );
}
