import { describe, expect, it } from 'vitest';
import { formatDay, mapCard, type MapCardInput } from './mapCard';

const base: MapCardInput = {
  kind: 'been',
  name: 'Kyani & Co.',
  areaName: 'Kalbadevi',
  type: 'cafe',
  cuisineTags: ['irani_cafe'],
  dietFlags: ['egg'],
  verdict: 'go',
  onlyForText: null,
  visits: 3,
  lastVisited: '2026-11-02',
  savedAt: null,
};

describe('mapCard', () => {
  it('shows everything about a place you have been', () => {
    expect(mapCard(base)).toEqual({
      title: 'Kyani & Co.',
      badge: 'Been',
      verdict: { text: 'Your verdict: GO', tone: 'go' },
      lines: ['Kalbadevi · Cafe', 'Irani cafe · Egg', '3 visits · last 2 Nov 2026'],
    });
  });

  it('keeps the Only for note and singular visits', () => {
    const c = mapCard({ ...base, verdict: 'only_for', onlyForText: 'the berry pulao', visits: 1 });
    expect(c.verdict?.text).toBe('Your verdict: ONLY FOR the berry pulao');
    expect(c.lines[2]).toBe('1 visit · last 2 Nov 2026');
  });

  it('shows when a Want to go place was saved, and no verdict', () => {
    const c = mapCard({
      ...base,
      kind: 'want',
      verdict: null,
      visits: 0,
      lastVisited: null,
      savedAt: '2026-11-01T20:00:00Z',
      cuisineTags: [],
      dietFlags: [],
    });
    expect(c.badge).toBe('Want to go');
    expect(c.verdict).toBeNull();
    expect(c.lines).toEqual(['Kalbadevi · Cafe', 'Saved 2 Nov 2026']); // 20:00 UTC is 1:30 IST next day
  });
});

describe('formatDay', () => {
  it('reads plain dates as IST days', () => {
    expect(formatDay('2026-01-05')).toBe('5 Jan 2026');
  });
});
