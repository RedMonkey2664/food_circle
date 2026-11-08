import { describe, expect, it } from 'vitest';
import {
  cleanName,
  cuisineTagsFor,
  dedupeRows,
  dietFlagsFor,
  placeTypeFor,
  toImportRow,
  attractionCore,
  dedupeAttractions,
  namesOtherRegion,
  mislocatedFamous,
  type ImportRow,
  type OvertureRow,
} from './transform';

const base: OvertureRow = {
  id: 'ov-1',
  name: 'Kyani and Company',
  lat: 18.94,
  lng: 72.83,
  confidence: 0.98,
  basic_category: 'food_and_beverage_store',
  cat: 'bakery',
  operating_status: null,
  brand: null,
};

describe('placeTypeFor', () => {
  it('maps eateries, cafes, bars and stalls', () => {
    expect(placeTypeFor('casual_eatery', 'indian_restaurant')).toBe('restaurant');
    expect(placeTypeFor('coffee_shop', 'coffee_shop')).toBe('cafe');
    expect(placeTypeFor('bar', 'lounge')).toBe('bar');
    expect(placeTypeFor('food_truck_stand', null)).toBe('street_stall');
  });
  it('maps food shops by taxonomy and ignores other shops', () => {
    expect(placeTypeFor('food_and_beverage_store', 'bakery')).toBe('bakery');
    expect(placeTypeFor('shopping', 'indian_sweets_shop')).toBe('sweet_shop');
    expect(placeTypeFor('food_and_beverage_store', 'grocery_store')).toBeNull();
    expect(placeTypeFor('fashion_and_apparel_store', 'clothing_store')).toBeNull();
  });
  it('skips caterers and delivery-only kitchens', () => {
    expect(placeTypeFor('food_service', 'caterer')).toBeNull();
  });
});

describe('tags and flags', () => {
  it('derives cuisine from the category and Mumbai staples from the name', () => {
    expect(cuisineTagsFor('chinese_restaurant', 'Hakka House')).toEqual(['chinese']);
    expect(cuisineTagsFor('south_indian_restaurant', 'Madras Cafe')).toEqual(['udupi']);
    expect(cuisineTagsFor('restaurant', 'Ashok Vada Pav')).toEqual(['vada_pav']);
    expect(cuisineTagsFor('indian_restaurant', 'Cafe Irani Chaii')).toEqual(['irani_cafe']);
    expect(cuisineTagsFor('ice_cream_shop', 'Naturals')).toEqual(['ice_cream']);
  });
  it('marks vegetarian and halal places', () => {
    expect(dietFlagsFor('vegetarian_restaurant', 'Swati Snacks')).toEqual(['pure_veg']);
    expect(dietFlagsFor('restaurant', 'Shree Pure Veg')).toEqual(['pure_veg']);
    expect(dietFlagsFor('halal_restaurant', 'Noor')).toEqual(['halal']);
  });
});

describe('cleanName', () => {
  it('trims noise and drops category-only names', () => {
    expect(cleanName('  Doolally  Taproom, ')).toBe('Doolally Taproom');
    expect(cleanName('Bakery & Cake Shop')).toBeNull();
    expect(cleanName('Restaurant')).toBeNull();
    expect(cleanName(null)).toBeNull();
  });
});

describe('toImportRow', () => {
  it('keeps confident open places as confirmed', () => {
    const r = toImportRow(base, []);
    expect(r).toMatchObject({ overture_id: 'ov-1', type: 'bakery', confident: true });
  });
  it('imports low-confidence places as unverified and drops very low ones', () => {
    expect(toImportRow({ ...base, confidence: 0.3 }, [])?.confident).toBe(false);
    expect(toImportRow({ ...base, confidence: 0.1 }, [])).toBeNull();
  });
  it('drops closed places', () => {
    expect(toImportRow({ ...base, operating_status: 'permanently_closed' }, [])).toBeNull();
  });
  it('links curated brands', () => {
    const brands = [{ slug: 'kfc', name: 'KFC', match: ['kfc'] }];
    const r = toImportRow(
      { ...base, name: 'KFC', basic_category: 'fast_food_restaurant', cat: null },
      brands,
    );
    expect(r?.brand_slug).toBe('kfc');
  });
  it('imports confident attractions with their category and no food tags', () => {
    const fort = toImportRow(
      { ...base, name: 'Amber Fort', basic_category: 'fort', cat: 'fort', confidence: 0.8 },
      [],
    );
    expect(fort).toMatchObject({
      type: 'attraction',
      category: 'fort',
      diet_flags: [],
      cuisine_tags: [],
    });
    expect(
      toImportRow(
        { ...base, name: 'Old Fort', basic_category: 'fort', cat: 'fort', confidence: 0.4 },
        [],
      ),
    ).toBeNull();
    expect(
      toImportRow({ ...base, name: 'Ram Park', basic_category: 'park', cat: 'park' }, []),
    ).toBeNull();
  });
});

describe('dedupeRows', () => {
  const row = (id: string, lat: number, confidence: number): ImportRow => ({
    overture_id: id,
    name: 'Naturals Ice Cream',
    lat,
    lng: 72.83,
    type: 'restaurant',
    category: null,
    diet_flags: [],
    cuisine_tags: [],
    brand_slug: null,
    brand_name: null,
    confident: true,
    confidence,
  });
  it('keeps the most confident of near-identical rows, but keeps far-apart branches', () => {
    const out = dedupeRows([row('a', 19.0, 0.6), row('b', 19.0001, 0.9), row('c', 19.05, 0.7)]);
    expect(out.map((r) => r.overture_id).sort()).toEqual(['b', 'c']);
  });
});

describe('attractions cleanup', () => {
  const sight = (
    id: string,
    name: string,
    lat: number,
    category: string,
    confidence: number,
  ): ImportRow => ({
    overture_id: id,
    name,
    lat,
    lng: 75.85,
    type: 'attraction',
    diet_flags: [],
    cuisine_tags: [],
    brand_slug: null,
    brand_name: null,
    confident: true,
    confidence,
    category,
  });
  const words = ['jaipur', 'rajasthan'];
  it('strips place words and filler from names', () => {
    expect(attractionCore('Amber Fort Jaipur, India', words)).toBe('amber fort');
    expect(attractionCore('Amber Fort A world  Heritage Site', words)).toBe('amber fort');
  });
  it('keeps one Amber Fort, preferring the fort category', () => {
    const out = dedupeAttractions(
      [
        sight('a', 'Amber Fort A world Heritage Site', 26.9855, 'historic_site', 0.85),
        sight('b', 'Amber Fort', 26.9856, 'fort', 0.76),
        sight('c', 'Amber Fort Jaipur, India', 26.9331, 'museum', 0.73),
        sight('e', 'Hanuman Mandir', 26.9, 'religious_organization', 0.8),
        sight('f', 'Hanuman Mandir', 26.95, 'religious_organization', 0.8),
        sight('d', 'Jaigarh Fort', 26.985, 'fort', 0.8),
      ],
      words,
    );
    // The decorated copy 6 km away goes; two plain same-name temples 5 km apart both stay.
    expect(out.map((r) => r.overture_id).sort()).toEqual(['b', 'd', 'e', 'f']);
  });
  it('drops sights whose name says they are in another region', () => {
    expect(namesOtherRegion('Baga Beach,goa', ['jaipur'], ['goa', 'agra'])).toBe(true);
    expect(namesOtherRegion('Hawa Mahal, Jaipur', ['jaipur'], ['goa'])).toBe(false);
    expect(namesOtherRegion('Delhi Darwaza', ['jaipur'], ['delhi'])).toBe(false);
    expect(
      namesOtherRegion(
        'Baga Beach , North Goa',
        ['south goa', 'goa', 'south'],
        ['north goa', 'north'],
      ),
    ).toBe(true);
  });
});

describe('mislocatedFamous', () => {
  it('drops a lone famous name pinned in another city, keeps genuine repeats', () => {
    const items = [
      ...Array.from({ length: 4 }, () => ({ region: 'agra', core: 'taj mahal' })),
      { region: 'delhi', core: 'taj mahal' },
      ...Array.from({ length: 3 }, () => ({ region: 'delhi', core: 'jama masjid' })),
      { region: 'agra', core: 'jama masjid' },
      { region: 'agra', core: 'jama masjid' },
      { region: 'jaipur', core: 'clock tower' },
      { region: 'pune', core: 'clock tower' },
    ];
    expect([...mislocatedFamous(items)]).toEqual(['delhi|taj mahal']);
  });
});
