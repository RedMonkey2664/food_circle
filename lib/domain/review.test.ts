import { describe, expect, it } from 'vitest';
import { addDish, fitWithin, priceBand, priceLabel } from './review';

describe('price', () => {
  it('bands per head', () => {
    expect(priceBand(150)).toBe('budget');
    expect(priceBand(300)).toBe('budget');
    expect(priceBand(301)).toBe('mid');
    expect(priceBand(800)).toBe('mid');
    expect(priceBand(1200)).toBe('splurge');
  });
  it('labels the top of the slider as open-ended', () => {
    expect(priceLabel(450)).toBe('₹450 per head · Mid');
    expect(priceLabel(3000)).toBe('₹3000+ per head · Splurge');
  });
});

describe('fitWithin', () => {
  it('shrinks the long edge to the limit and keeps the ratio', () => {
    expect(fitWithin(4032, 3024, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3024, 4032, 1280)).toEqual({ width: 960, height: 1280 });
  });
  it('never upscales', () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });
});

describe('addDish', () => {
  it('tidies names and skips duplicates', () => {
    expect(addDish([], '  Bun   maska ')).toEqual(['Bun maska']);
    expect(addDish(['Bun maska'], 'BUN MASKA')).toEqual(['Bun maska']);
    expect(addDish(['Bun maska'], '   ')).toEqual(['Bun maska']);
  });
  it('stops at ten dishes', () => {
    const ten = Array.from({ length: 10 }, (_, i) => `Dish ${i}`);
    expect(addDish(ten, 'One more')).toHaveLength(10);
  });
});
