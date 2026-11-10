import { GoIcon, OnlyForIcon, SkipIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { verdictText, type Verdict } from '@/lib/domain/verdict';

const tone: Record<Verdict, string> = {
  go: 'text-go',
  skip: 'text-skip',
  only_for: 'text-onlyfor',
};

const Icon = { go: GoIcon, skip: SkipIcon, only_for: OnlyForIcon } as const;

/** Inline verdict for cards and feeds: icon + text + colour, never colour alone. */
export function VerdictLabel({
  verdict,
  onlyForText,
  stamped = false,
}: {
  verdict: Verdict;
  onlyForText?: string | null;
  /** Rubber-stamp it in as soon as it appears (the "Logged" confirmation). */
  stamped?: boolean;
}) {
  const I = Icon[verdict];
  return (
    <span
      data-stamp=""
      className={cn(
        'relative inline-flex items-center gap-1.5 font-bold',
        tone[verdict],
        stamped && 'sk-stamp-in',
      )}
    >
      <I size={18} />
      <span>{verdictText(verdict, onlyForText)}</span>
    </span>
  );
}
