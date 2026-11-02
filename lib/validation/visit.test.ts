import { describe, expect, it } from 'vitest';
import { logVisitInput } from './visit';

const base = {
  placeId: '00000000-0000-4000-b000-000000000001',
  verdict: 'go',
  visibility: 'followers',
};

describe('logVisitInput', () => {
  it('accepts a verdict-only log', () => {
    expect(logVisitInput.safeParse(base).success).toBe(true);
  });
  it('requires the only-for text with only_for and trims it', () => {
    expect(logVisitInput.safeParse({ ...base, verdict: 'only_for' }).success).toBe(false);
    const r = logVisitInput.parse({ ...base, verdict: 'only_for', onlyForText: '  the misal ' });
    expect(r.onlyForText).toBe('the misal');
  });
  it('rejects only-for text on other verdicts', () => {
    expect(logVisitInput.safeParse({ ...base, onlyForText: 'x' }).success).toBe(false);
  });
  it('caps only-for text at 60 characters', () => {
    expect(
      logVisitInput.safeParse({ ...base, verdict: 'only_for', onlyForText: 'x'.repeat(61) })
        .success,
    ).toBe(false);
  });
  it('rejects bad ids, verdicts and visibilities', () => {
    expect(logVisitInput.safeParse({ ...base, placeId: 'nope' }).success).toBe(false);
    expect(logVisitInput.safeParse({ ...base, verdict: 'maybe' }).success).toBe(false);
    expect(logVisitInput.safeParse({ ...base, visibility: 'everyone' }).success).toBe(false);
  });
});
