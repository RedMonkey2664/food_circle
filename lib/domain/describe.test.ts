import { describe, expect, it } from 'vitest';
import { describePlace } from './describe';

describe('describePlace', () => {
  it('describes a cafe with its area and city', () => {
    expect(describePlace({ type: 'cafe', areaName: 'Bandra West', city: 'Mumbai' })).toBe(
      'A cafe in Bandra West, Mumbai.',
    );
  });
  it('uses cuisine and pure veg', () => {
    expect(
      describePlace({
        type: 'restaurant',
        cuisineTags: ['udupi'],
        dietFlags: ['pure_veg'],
        areaName: 'Matunga East',
        city: 'Mumbai',
      }),
    ).toBe('A pure-veg Udupi restaurant in Matunga East, Mumbai.');
  });
  it('names attractions by category and does not repeat the city', () => {
    expect(
      describePlace({
        type: 'attraction',
        category: 'fort',
        areaName: 'Amer, Jaipur',
        city: 'Jaipur',
      }),
    ).toBe('A fort in Amer, Jaipur.');
    expect(describePlace({ type: 'attraction', category: 'art_gallery', city: 'Kochi' })).toBe(
      'An art gallery in Kochi.',
    );
  });
  it('handles street food specials and missing places', () => {
    expect(describePlace({ type: 'street_stall', cuisineTags: ['vada_pav'] })).toBe(
      'A vada pav stall.',
    );
    expect(describePlace({ type: 'other' })).toBe('A food spot.');
  });
});
