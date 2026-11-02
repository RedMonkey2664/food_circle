import { describe, expect, it } from 'vitest';
import { handoffAllowed, handoffUrl } from './handoff';

const cafe = {
  name: 'Kyani & Co.',
  areaName: 'Marine Lines',
  type: 'cafe' as const,
  status: 'confirmed' as const,
};
const templates = {
  swiggy: (q: string) => `https://example.test/s?query=${encodeURIComponent(q)}`,
  zomato: null,
};

describe('handoffAllowed', () => {
  it('never hands off street stalls, closed or unverified user places', () => {
    expect(handoffAllowed({ ...cafe, type: 'street_stall' })).toBe(false);
    expect(handoffAllowed({ ...cafe, status: 'closed' })).toBe(false);
    expect(handoffAllowed({ ...cafe, status: 'unverified', source: 'user' })).toBe(false);
    expect(handoffAllowed(cafe)).toBe(true);
  });
});

describe('handoffUrl', () => {
  it('is hidden when the flag is off or the template is not verified', () => {
    expect(handoffUrl('swiggy', cafe, false, templates)).toBeNull();
    expect(handoffUrl('zomato', cafe, true, templates)).toBeNull();
  });
  it('builds a search link from name and area', () => {
    expect(handoffUrl('swiggy', cafe, true, templates)).toBe(
      'https://example.test/s?query=Kyani%20%26%20Co.%20Marine%20Lines',
    );
  });
  it('ships with no unverified templates', async () => {
    const { HANDOFF_TEMPLATES } = await import('./handoff');
    expect(HANDOFF_TEMPLATES.swiggy).toBeNull();
    expect(HANDOFF_TEMPLATES.zomato).toBeNull();
  });
});
