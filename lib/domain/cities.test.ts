import { describe, expect, it } from 'vitest';
import { CITIES, cityCenter, formatNear, parseNear } from './cities';

describe('cities', () => {
  it('lists Mumbai first and has unique slugs', () => {
    expect(CITIES[0]?.slug).toBe('mumbai');
    expect(new Set(CITIES.map((c) => c.slug)).size).toBe(CITIES.length);
  });
  it('centres a city inside its box', () => {
    const jaipur = CITIES.find((c) => c.slug === 'jaipur');
    const c = jaipur ? cityCenter(jaipur) : { lat: 0, lng: 0 };
    expect(c.lat).toBeCloseTo(26.9);
    expect(c.lng).toBeCloseTo(75.8);
  });
  it('round-trips the near cookie and rounds "near me" to about 1 km', () => {
    expect(formatNear({ slug: 'me', lat: 19.07612, lng: 72.87765 })).toBe('me|19.08,72.88');
    expect(parseNear('me|19.08,72.88')).toEqual({ slug: 'me', lat: 19.08, lng: 72.88 });
    expect(parseNear('jaipur|26.90,75.80')?.slug).toBe('jaipur');
  });
  it('ignores junk, unknown cities and points outside India', () => {
    expect(parseNear('atlantis|26.90,75.80')).toBeNull();
    expect(parseNear('me|51.50,-0.12')).toBeNull();
    expect(parseNear('<script>')).toBeNull();
    expect(parseNear(undefined)).toBeNull();
  });
});
