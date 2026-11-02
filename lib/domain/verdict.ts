// Verdicts (PRODUCT_SPEC.md §4). Labels never change per screen (UI_UX.md §5).
export const VERDICTS = ['go', 'skip', 'only_for'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const VERDICT_LABEL: Record<Verdict, string> = {
  go: 'GO',
  skip: 'SKIP',
  only_for: 'ONLY FOR',
};

export const ONLY_FOR_MAX = 60;

/** "ONLY FOR the misal" style display; falls back to the bare label. */
export function verdictText(verdict: Verdict, onlyForText?: string | null): string {
  const label = VERDICT_LABEL[verdict];
  const extra = onlyForText?.trim();
  return verdict === 'only_for' && extra ? `${label} ${extra}` : label;
}
