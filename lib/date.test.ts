import { describe, expect, it } from 'vitest';
import { istDate, monthStart, weekStart } from './date';

describe('istDate', () => {
  it('rolls over to the next day at 18:30 UTC (midnight IST)', () => {
    expect(istDate(new Date('2026-11-02T18:29:59Z'))).toBe('2026-11-02');
    expect(istDate(new Date('2026-11-02T18:30:00Z'))).toBe('2026-11-03');
  });
});

describe('weekStart', () => {
  it('returns Monday for any day in the week', () => {
    expect(weekStart('2026-11-02')).toBe('2026-11-02'); // Monday
    expect(weekStart('2026-11-08')).toBe('2026-11-02'); // Sunday
    expect(weekStart('2026-11-09')).toBe('2026-11-09');
  });
  it('crosses month boundaries', () => {
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
  });
  it('rejects bad input', () => {
    expect(() => weekStart('2026/11/01')).toThrow();
  });
});

describe('monthStart', () => {
  it('returns the first of the month', () => {
    expect(monthStart('2026-02-28')).toBe('2026-02-01');
  });
});
