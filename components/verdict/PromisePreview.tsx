import type { CSSProperties } from 'react';
import { RelationshipTag } from './RelationshipTag';
import { VerdictLabel } from './VerdictLabel';
import type { Verdict } from '@/lib/domain/verdict';

// Illustrative sample for the sign-in screen: the product's core sentence, built from the
// real tag and verdict components. Marked as an example for screen readers.
const sample: Array<{
  name: string;
  initial: string;
  verdict: Verdict;
  note?: string;
  group?: string;
}> = [
  { name: 'Rahul', initial: 'R', verdict: 'go', group: 'College gang' },
  { name: 'Ananya', initial: 'A', verdict: 'only_for', note: 'the misal' },
  { name: 'Kabir', initial: 'K', verdict: 'skip' },
];

export function PromisePreview() {
  return (
    <figure
      aria-label="Example: three friends' verdicts on one place"
      className="border-line bg-surface rounded-[var(--radius-card)] border p-4 shadow-[0_1px_0_var(--c-line)]"
    >
      <figcaption className="mb-3">
        <span className="font-display block text-lg font-semibold">Laxmi Misal House</span>
        <span className="text-muted text-sm">Dadar West. 3 of your friends went.</span>
      </figcaption>
      <ul className="space-y-2.5">
        {sample.map((s, i) => (
          <li
            key={s.name}
            className="promise-row flex items-center gap-3"
            style={{ '--i': i } as CSSProperties}
          >
            <span
              aria-hidden
              className="bg-primary-soft font-display text-primary flex size-9 shrink-0 items-center justify-center rounded-full font-semibold"
            >
              {s.initial}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold">{s.name}</span>
                <RelationshipTag tier="friend" group={s.group} />
              </div>
              <div className="promise-verdict mt-0.5 text-sm">
                <VerdictLabel verdict={s.verdict} onlyForText={s.note} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}
