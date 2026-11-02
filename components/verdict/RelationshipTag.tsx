import { cn } from '@/lib/cn';
import { TIER_TAG_LABEL, type Tier } from '@/lib/domain/tiers';

const styles: Record<Tier, string> = {
  friend: 'bg-primary text-on-primary font-bold tracking-wide',
  following: 'bg-following-bg text-following-fg font-semibold',
  public: 'bg-public-bg text-public-fg font-medium',
};

/** The author's relationship to the viewer. Always visible, always text (PRODUCT_SPEC §6). */
export function RelationshipTag({ tier, group }: { tier: Tier; group?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('rounded-[var(--radius-pill)] px-2 py-0.5 text-xs', styles[tier])}>
        {TIER_TAG_LABEL[tier]}
      </span>
      {group ? (
        <span className="border-primary/40 text-primary rounded-[var(--radius-pill)] border px-2 py-0.5 text-xs font-medium">
          {group}
        </span>
      ) : null}
    </span>
  );
}
