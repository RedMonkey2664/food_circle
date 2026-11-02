// Place summary copy (PRODUCT_SPEC.md §6). Each tier is summarised on its own.
// There is deliberately NO function here that adds tiers together.
import type { Tier } from './tiers';

export type TierCounts = { went: number; go: number; skip: number; onlyFor: number };

export type PlaceSummary = {
  you: TierCounts | null;
  tiers: Record<Tier, TierCounts | null>;
};

type Row = {
  tier: number;
  went: number;
  go_count: number;
  skip_count: number;
  only_for_count: number;
};

export function summaryFromRows(rows: readonly Row[]): PlaceSummary {
  const pick = (t: number): TierCounts | null => {
    const r = rows.find((x) => x.tier === t);
    return r
      ? { went: r.went, go: r.go_count, skip: r.skip_count, onlyFor: r.only_for_count }
      : null;
  };
  return { you: pick(0), tiers: { friend: pick(1), following: pick(2), public: pick(3) } };
}

/** "3 went" */
export function wentText(c: TierCounts): string {
  return `${c.went} went`;
}

/** "2 Go, 1 Only for, 1 Skip". Zero counts are left out; "Only for" appears only if present. */
export function breakdownText(c: TierCounts): string {
  const parts: string[] = [];
  if (c.go > 0) parts.push(`${c.go} Go`);
  if (c.onlyFor > 0) parts.push(`${c.onlyFor} Only for`);
  if (c.skip > 0) parts.push(`${c.skip} Skip`);
  return parts.join(', ');
}
