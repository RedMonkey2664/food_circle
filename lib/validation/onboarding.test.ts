import { describe, expect, it } from 'vitest';
import { onboardingFromForm, onboardingInput } from './onboarding';

const base = {
  username: 'Riya.Eats',
  displayName: ' Riya ',
  homeAreaId: null,
  dietPrefs: ['veg'],
  isPrivate: false,
  defaultVisibility: 'followers',
};

describe('onboardingInput', () => {
  it('normalizes username and trims name', () => {
    const r = onboardingInput.parse(base);
    expect(r.username).toBe('riya.eats');
    expect(r.displayName).toBe('Riya');
  });
  it.each(['ab', 'has space', 'émoji', 'x'.repeat(25)])('rejects username %j', (username) => {
    expect(onboardingInput.safeParse({ ...base, username }).success).toBe(false);
  });
  it('rejects unknown diet values', () => {
    expect(onboardingInput.safeParse({ ...base, dietPrefs: ['vegan'] }).success).toBe(false);
  });
  it('rejects a private account defaulting to public', () => {
    expect(
      onboardingInput.safeParse({ ...base, isPrivate: true, defaultVisibility: 'public' }).success,
    ).toBe(false);
  });
});

describe('onboardingFromForm', () => {
  it('reads multi-select diet and empty area', () => {
    const f = new FormData();
    f.set('username', 'riya');
    f.set('displayName', 'Riya');
    f.set('homeAreaId', '');
    f.append('dietPrefs', 'veg');
    f.append('dietPrefs', 'jain');
    f.set('isPrivate', 'true');
    f.set('defaultVisibility', 'friends');
    expect(onboardingFromForm(f)).toMatchObject({
      homeAreaId: null,
      dietPrefs: ['veg', 'jain'],
      isPrivate: true,
    });
  });
});
