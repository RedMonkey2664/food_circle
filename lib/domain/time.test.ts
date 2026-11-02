import { describe, expect, it } from 'vitest';
import { visitAge } from './time';

const now = new Date('2026-11-03T06:00:00Z'); // 3 Nov, 11:30 IST

describe('visitAge', () => {
  it.each([
    ['2026-11-03', 'today'],
    ['2026-11-02', '1d'],
    ['2026-10-30', '4d'],
    ['2026-10-20', '2w'],
    ['2026-08-01', '3mo'],
    ['2024-11-01', '2y'],
    ['2026-11-05', 'today'], // future dates never show negative ages
  ])('%s -> %s', (date, expected) => {
    expect(visitAge(date, now)).toBe(expected);
  });
});
