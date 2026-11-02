import { describe, expect, it } from 'vitest';
import { displayDietFlags } from './diet';
import { TIER_TAG_LABEL, tierFromNumber } from './tiers';
import { verdictText } from './verdict';

describe('tiers', () => {
  it('maps database tier numbers and rejects self/unknown', () => {
    expect(tierFromNumber(1)).toBe('friend');
    expect(tierFromNumber(2)).toBe('following');
    expect(tierFromNumber(3)).toBe('public');
    expect(tierFromNumber(0)).toBeNull();
    expect(tierFromNumber(9)).toBeNull();
  });
  it('labels every tier with text', () => {
    expect(Object.values(TIER_TAG_LABEL).every((l) => l.length > 0)).toBe(true);
  });
});

describe('verdictText', () => {
  it('appends the only-for text', () => {
    expect(verdictText('only_for', ' the misal ')).toBe('ONLY FOR the misal');
  });
  it('ignores only-for text on other verdicts', () => {
    expect(verdictText('go', 'ignored')).toBe('GO');
  });
});

describe('displayDietFlags', () => {
  it('keeps known flags in a stable order and drops unknown ones', () => {
    expect(displayDietFlags(['egg', 'bogus', 'pure_veg'])).toEqual(['pure_veg', 'egg']);
  });
});
