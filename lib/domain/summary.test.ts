import { describe, expect, it } from 'vitest';
import * as summary from './summary';
import { breakdownText, summaryFromRows, wentText } from './summary';

const rows = [
  { tier: 0, went: 1, go_count: 1, skip_count: 0, only_for_count: 0 },
  { tier: 1, went: 3, go_count: 2, skip_count: 1, only_for_count: 0 },
  { tier: 3, went: 38, go_count: 26, skip_count: 12, only_for_count: 0 },
];

describe('summaryFromRows', () => {
  it('keeps every tier separate and marks missing tiers as null', () => {
    const s = summaryFromRows(rows);
    expect(s.you?.went).toBe(1);
    expect(s.tiers.friend).toEqual({ went: 3, go: 2, skip: 1, onlyFor: 0 });
    expect(s.tiers.following).toBeNull();
    expect(s.tiers.public?.went).toBe(38);
  });
  it('exposes no way to blend tiers into one total', () => {
    const names = Object.keys(summary);
    expect(names.some((n) => /total|blend|average|combined/i.test(n))).toBe(false);
  });
});

describe('copy', () => {
  it('formats went and breakdown like the spec', () => {
    expect(wentText({ went: 3, go: 2, skip: 1, onlyFor: 0 })).toBe('3 went');
    expect(breakdownText({ went: 3, go: 2, skip: 1, onlyFor: 0 })).toBe('2 Go, 1 Skip');
    expect(breakdownText({ went: 4, go: 2, skip: 1, onlyFor: 1 })).toBe('2 Go, 1 Only for, 1 Skip');
    expect(breakdownText({ went: 1, go: 0, skip: 1, onlyFor: 0 })).toBe('1 Skip');
  });
});
