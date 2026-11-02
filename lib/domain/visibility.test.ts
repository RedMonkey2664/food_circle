import { describe, expect, it } from 'vitest';
import { defaultVisibility, visibilityOptions, whoCanSee } from './visibility';

describe('defaultVisibility', () => {
  it('defaults to the narrower audience', () => {
    expect(defaultVisibility(false)).toBe('followers');
    expect(defaultVisibility(true)).toBe('friends');
  });
});

describe('visibilityOptions', () => {
  it('never offers Public to private accounts', () => {
    expect(visibilityOptions(true)).not.toContain('public');
    expect(visibilityOptions(false)).toContain('public');
  });
});

describe('whoCanSee', () => {
  it('describes each audience in plain words', () => {
    expect(whoCanSee('private', false)).toBe('Only you can see this.');
    expect(whoCanSee('friends', false)).toBe('Visible to your friends.');
    expect(whoCanSee('public', false)).toBe('Visible to anyone on Food Circle.');
  });
  it('uses counts with correct plurals', () => {
    expect(whoCanSee('followers', false, { friends: 12, followers: 1 })).toBe(
      'Visible to your 12 friends and 1 follower.',
    );
    expect(whoCanSee('friends', false, { friends: 1 })).toBe('Visible to your 1 friend.');
  });
  it('explains that public entries on a private account stay with friends and followers', () => {
    expect(whoCanSee('public', true)).toBe(
      'Visible to your friends and your followers (your account is private).',
    );
  });
});
