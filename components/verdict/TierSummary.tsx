import { cn } from '@/lib/cn';
import { breakdownText, wentText, type PlaceSummary, type TierCounts } from '@/lib/domain/summary';
import { TIER_SUMMARY_HEADING, TIERS, type Tier } from '@/lib/domain/tiers';

const headingTone: Record<Tier, string> = {
  friend: 'text-primary',
  following: 'text-following-fg',
  public: 'text-public-fg',
};

/**
 * Three rows: Friends / Following / Everyone, each with its own counts.
 * Never a combined number, never an average (PRODUCT_SPEC.md §6, rule 1).
 */
export function TierSummary({ summary }: { summary: PlaceSummary }) {
  return (
    <dl className="border-line bg-surface divide-line divide-y rounded-[var(--radius-card)] border">
      {TIERS.map((tier) => (
        <Row key={tier} tier={tier} counts={summary.tiers[tier]} />
      ))}
    </dl>
  );
}

function Row({ tier, counts }: { tier: Tier; counts: TierCounts | null }) {
  return (
    <div className="flex items-baseline gap-3 px-4 py-3">
      <dt
        className={cn('w-24 shrink-0 text-xs font-bold tracking-wide uppercase', headingTone[tier])}
      >
        {TIER_SUMMARY_HEADING[tier]}
      </dt>
      <dd className="min-w-0 flex-1">
        {counts ? (
          <>
            <span className="font-display text-lg font-semibold">{wentText(counts)}</span>
            <span className="text-muted ml-2 text-sm">{breakdownText(counts)}</span>
          </>
        ) : (
          <span className="text-muted text-sm">No one yet</span>
        )}
      </dd>
    </div>
  );
}
