// Place diet flags (DATABASE.md places.diet_flags) and their display.
export const DIET_FLAGS = ['pure_veg', 'veg_options', 'jain', 'halal', 'egg'] as const;
export type DietFlag = (typeof DIET_FLAGS)[number];

export const DIET_LABEL: Record<DietFlag, string> = {
  pure_veg: 'Pure veg',
  veg_options: 'Veg-friendly',
  jain: 'Jain',
  halal: 'Halal',
  egg: 'Egg',
};

export function isDietFlag(value: string): value is DietFlag {
  return (DIET_FLAGS as readonly string[]).includes(value);
}

/** Known flags in display order; unknown strings from the database are dropped. */
export function displayDietFlags(flags: readonly string[]): DietFlag[] {
  return DIET_FLAGS.filter((f) => flags.includes(f));
}
