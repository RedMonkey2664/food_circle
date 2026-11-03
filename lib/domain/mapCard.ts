// The card shown when you hover (PC) or tap (phone/iPad) a pin on your diary map. Pure: tested.
import { DIET_LABEL, displayDietFlags } from './diet';
import { PLACE_TYPE_LABEL, cuisineLabel, type PlaceType } from './place';
import { verdictText, type Verdict } from './verdict';

export type MapCardInput = {
  kind: 'been' | 'want' | 'explore';
  name: string;
  areaName: string | null;
  type: PlaceType;
  cuisineTags: string[];
  dietFlags: string[];
  verdict: Verdict | null;
  onlyForText: string | null;
  visits: number;
  lastVisited: string | null; // YYYY-MM-DD
  savedAt: string | null; // ISO timestamp
};

export type MapCard = {
  title: string;
  /** Text badge, never colour alone: "Been" / "Want to go" / "To explore". */
  badge: string;
  verdict: { text: string; tone: Verdict } | null;
  lines: string[];
};

/** "2 Nov 2026" in IST, the product's day. */
export function formatDay(value: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00+05:30`)
    : new Date(value);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

export function mapCard(p: MapCardInput): MapCard {
  const lines: string[] = [];
  lines.push([p.areaName, PLACE_TYPE_LABEL[p.type]].filter(Boolean).join(' · '));
  const food = [
    ...p.cuisineTags.slice(0, 3).map(cuisineLabel),
    ...displayDietFlags(p.dietFlags).map((f) => DIET_LABEL[f]),
  ];
  if (food.length) lines.push(food.join(' · '));

  if (p.kind === 'been') {
    const visits = p.visits === 1 ? '1 visit' : `${p.visits} visits`;
    lines.push(p.lastVisited ? `${visits} · last ${formatDay(p.lastVisited)}` : visits);
  } else if (p.savedAt) {
    lines.push(`Saved ${formatDay(p.savedAt)}`);
  }

  return {
    title: p.name,
    badge: p.kind === 'been' ? 'Been' : p.kind === 'want' ? 'Want to go' : 'To explore',
    verdict:
      p.kind === 'been' && p.verdict
        ? { text: `Your verdict: ${verdictText(p.verdict, p.onlyForText)}`, tone: p.verdict }
        : null,
    lines,
  };
}
