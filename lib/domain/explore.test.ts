import { describe, expect, it } from 'vitest';
import { exploreHref, hasFilters, parseExploreFilters } from './explore';

describe('parseExploreFilters', () => {
  it('reads valid filters', () => {
    expect(
      parseExploreFilters({
        type: 'cafe',
        cuisine: 'irani_cafe',
        veg: '1',
        q: ' kyani ',
        page: '3',
      }),
    ).toEqual({ type: 'cafe', cuisine: 'irani_cafe', veg: true, q: 'kyani', page: 3 });
  });

  it('ignores anything invalid instead of failing', () => {
    expect(
      parseExploreFilters({
        type: 'attraction',
        cuisine: "x'; drop table",
        veg: 'yes',
        q: '   ',
        page: '-2',
      }),
    ).toEqual({ veg: false, page: 1 });
    expect(parseExploreFilters({ type: ['bar', 'cafe'] })).toEqual({
      type: 'bar',
      veg: false,
      page: 1,
    });
  });
});

describe('exploreHref', () => {
  it('builds the URL and drops page 1', () => {
    expect(exploreHref({})).toBe('/explore');
    expect(exploreHref({ type: 'cafe', veg: true, page: 1 })).toBe('/explore?type=cafe&veg=1');
    expect(exploreHref({ cuisine: 'udupi', page: 2 })).toBe('/explore?cuisine=udupi&page=2');
  });

  it('round-trips through the parser', () => {
    const f = { type: 'bakery', cuisine: 'pizza', veg: true, q: 'bandra', page: 4 } as const;
    const params = Object.fromEntries(new URL(exploreHref(f), 'http://x').searchParams);
    expect(parseExploreFilters(params)).toEqual(f);
  });
});

describe('hasFilters', () => {
  it('ignores the page number', () => {
    expect(hasFilters({ veg: false, page: 3 })).toBe(false);
    expect(hasFilters({ veg: true, page: 1 })).toBe(true);
  });
});
