import { describe, expect, it } from 'vitest';
import { googleMapsUrl } from './mapsLink';
import { parseTakeout, verdictForStars } from './takeout';

describe('parseTakeout', () => {
  it('reads the current Reviews.json format', () => {
    const items = parseTakeout({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [72.8323, 18.9227] },
          properties: {
            date: '2023-04-02T10:11:12Z',
            five_star_rating_published: 5,
            location: { name: 'Leopold Cafe', address: 'Colaba Causeway, Mumbai' },
            review_text_published: 'Classic.',
          },
        },
      ],
    });
    expect(items).toEqual([
      {
        kind: 'review',
        name: 'Leopold Cafe',
        lat: 18.9227,
        lng: 72.8323,
        rating: 5,
        text: 'Classic.',
        date: '2023-04-02',
        address: 'Colaba Causeway, Mumbai',
      },
    ]);
  });

  it('reads the older format with Geo Coordinates and Star Rating', () => {
    const [item] = parseTakeout({
      features: [
        {
          geometry: { coordinates: [0, 0] },
          properties: {
            Published: '2019-08-01T00:00:00Z',
            'Star Rating': 2,
            'Review Comment': 'Cold food',
            Location: {
              'Business Name': 'Some Diner',
              'Geo Coordinates': { Latitude: '19.07', Longitude: '72.88' },
            },
          },
        },
      ],
    });
    expect(item).toMatchObject({
      name: 'Some Diner',
      lat: 19.07,
      lng: 72.88,
      rating: 2,
      date: '2019-08-01',
    });
  });

  it('treats entries without stars as saved places and skips ones without a location', () => {
    const items = parseTakeout({
      features: [
        { geometry: { coordinates: [72.83, 19.05] }, properties: { location: { name: 'Kyani' } } },
        { geometry: { coordinates: [0, 0] }, properties: { location: { name: 'Nowhere' } } },
      ],
    });
    expect(items.map((i) => `${i.kind}:${i.name}`)).toEqual(['saved:Kyani']);
  });

  it('never throws on junk', () => {
    expect(parseTakeout(null)).toEqual([]);
    expect(parseTakeout({ features: 'x' })).toEqual([]);
    expect(parseTakeout([1, 2])).toEqual([]);
  });
});

describe('verdictForStars', () => {
  it('maps stars to verdicts and asks about 3', () => {
    expect(verdictForStars(5)).toBe('go');
    expect(verdictForStars(4)).toBe('go');
    expect(verdictForStars(3)).toBeNull();
    expect(verdictForStars(2)).toBe('skip');
    expect(verdictForStars(1)).toBe('skip');
    expect(verdictForStars(null)).toBeNull();
  });
});

describe('googleMapsUrl', () => {
  it('searches by name, area and city without repeating the city', () => {
    expect(googleMapsUrl({ name: 'Leopold Cafe', areaName: 'Colaba', city: 'Mumbai' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=Leopold%20Cafe%2C%20Colaba%2C%20Mumbai',
    );
    expect(
      googleMapsUrl({ name: 'Toit', areaName: 'Indiranagar, Bengaluru', city: 'Bengaluru' }),
    ).toBe('https://www.google.com/maps/search/?api=1&query=Toit%2C%20Indiranagar%2C%20Bengaluru');
  });
});
