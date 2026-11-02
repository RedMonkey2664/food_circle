import { describe, expect, it } from 'vitest';
import { normalizeName, slugify } from './text';
import {
  cuisineTags,
  dedupeAreas,
  dietFlags,
  matchBrand,
  placeType,
  regionFor,
  toAreaRow,
  toPlaceRow,
} from './transform';

const brands = [{ slug: 'starbucks', name: 'Starbucks', match: ['starbucks', 'tata starbucks'] }];

describe('text helpers', () => {
  it('normalizeName matches the SQL function', () => {
    expect(normalizeName('Kyani & Co.')).toBe('kyani and co');
  });
  it('slugify makes kebab slugs', () => {
    expect(slugify('Bandra (West)')).toBe('bandra-west');
    expect(slugify('Vile Parle')).toBe('vile-parle');
  });
});

describe('placeType', () => {
  it.each([
    [{ amenity: 'cafe' }, 'cafe'],
    [{ amenity: 'fast_food' }, 'restaurant'],
    [{ amenity: 'ice_cream' }, 'restaurant'],
    [{ amenity: 'pub' }, 'bar'],
    [{ shop: 'pastry' }, 'bakery'],
    [{ shop: 'confectionery' }, 'sweet_shop'],
    [{ amenity: 'bank' }, null],
  ])('%j -> %s', (tags, expected) => {
    expect(placeType(tags)).toBe(expected);
  });
});

describe('dietFlags', () => {
  it('maps vegetarian and halal', () => {
    expect(dietFlags({ 'diet:vegetarian': 'only', 'diet:halal': 'yes' })).toEqual([
      'pure_veg',
      'halal',
    ]);
    expect(dietFlags({ 'diet:vegetarian': 'yes' })).toEqual(['veg_options']);
    expect(dietFlags({})).toEqual([]);
  });
});

describe('cuisineTags', () => {
  it('splits, snake-cases and maps synonyms', () => {
    expect(cuisineTags({ cuisine: 'Irani; south_indian;Street Food' }, 'X')).toEqual([
      'irani_cafe',
      'street_food',
      'udupi',
    ]);
  });
  it('only calls gujarati a thali when the name or tags say so', () => {
    expect(cuisineTags({ cuisine: 'gujarati' }, 'Shree Thaker Bhojanalay Thali')).toEqual([
      'gujarati_thali',
    ]);
    expect(cuisineTags({ cuisine: 'gujarati' }, 'Swati Snacks')).toEqual(['gujarati']);
  });
  it('tags ice cream shops', () => {
    expect(cuisineTags({ amenity: 'ice_cream' }, 'X')).toEqual(['ice_cream']);
  });
});

describe('matchBrand', () => {
  it('matches the curated list by name', () => {
    expect(matchBrand({}, 'Tata Starbucks', brands)).toEqual({
      slug: 'starbucks',
      name: 'Starbucks',
    });
  });
  it('keeps unknown OSM brand tags as their own brand', () => {
    expect(matchBrand({ brand: 'Jumboking' }, 'Jumboking Vada Pav', brands)).toEqual({
      slug: 'jumboking',
      name: 'Jumboking',
    });
  });
  it('treats independents as null', () => {
    expect(matchBrand({}, 'Kyani & Co.', brands)).toBeNull();
  });
});

describe('toPlaceRow', () => {
  it('skips unnamed features', () => {
    expect(
      toPlaceRow({ type: 'node', id: 1, lat: 19, lon: 72.8, tags: { amenity: 'cafe' } }, brands),
    ).toBeNull();
  });
  it('builds a row from a way centre with name:en alias', () => {
    const row = toPlaceRow(
      {
        type: 'way',
        id: 42,
        center: { lat: 18.94, lon: 72.83 },
        tags: { amenity: 'restaurant', name: 'क्याणी', 'name:en': 'Kyani' },
      },
      brands,
    );
    expect(row).toMatchObject({
      osm_id: 'way/42',
      type: 'restaurant',
      aliases: ['Kyani'],
      lat: 18.94,
      lng: 72.83,
    });
  });
});

describe('areas', () => {
  it('assigns coarse regions', () => {
    expect(regionFor(18.92, 72.83)).toBe('south-mumbai'); // Colaba
    expect(regionFor(19.06, 72.83)).toBe('western-suburbs'); // Bandra
    expect(regionFor(19.06, 72.9)).toBe('harbour'); // Chembur
    expect(regionFor(19.12, 72.91)).toBe('central-suburbs'); // Powai
  });
  it('prefers suburbs when slugs collide', () => {
    const n = toAreaRow({
      type: 'node',
      id: 1,
      lat: 19.06,
      lon: 72.83,
      tags: { place: 'neighbourhood', name: 'Bandra West' },
    });
    const s = toAreaRow({
      type: 'node',
      id: 2,
      lat: 19.06,
      lon: 72.83,
      tags: { place: 'suburb', name: 'Bandra West' },
    });
    expect(n && s && dedupeAreas([n, s])).toEqual([s]);
  });
});
