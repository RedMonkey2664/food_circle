import { DIET_LABEL, displayDietFlags, type DietFlag } from '@/lib/domain/diet';

/** India's vegetarian mark: a green dot inside a green square. */
function VegMark() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden
      focusable={false}
      className="shrink-0"
    >
      <rect
        x="1"
        y="1"
        width="12"
        height="12"
        rx="1.5"
        fill="none"
        stroke="var(--c-veg)"
        strokeWidth="1.6"
      />
      <circle cx="7" cy="7" r="3" fill="var(--c-veg)" />
    </svg>
  );
}

const veg = new Set<DietFlag>(['pure_veg', 'veg_options', 'jain']);

export function DietBadges({ flags }: { flags: readonly string[] }) {
  const shown = displayDietFlags(flags);
  if (shown.length === 0) {
    return <p className="text-muted text-sm">Diet info not available</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Diet">
      {shown.map((flag) => (
        <li
          key={flag}
          className="border-line bg-surface text-ink inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-1 text-sm font-medium"
        >
          {veg.has(flag) ? <VegMark /> : null}
          {DIET_LABEL[flag]}
        </li>
      ))}
    </ul>
  );
}
