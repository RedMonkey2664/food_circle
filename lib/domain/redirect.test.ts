import { describe, expect, it } from 'vitest';
import { isPublicPath, safeNextPath } from './redirect';

describe('safeNextPath', () => {
  it('keeps same-origin paths', () => {
    expect(safeNextPath('/place/abc?tab=friends')).toBe('/place/abc?tab=friends');
  });
  it.each([null, undefined, '', 'https://evil.com', '//evil.com', '/\\evil.com', 'evil', '/a\nb'])(
    'falls back to / for %j',
    (input) => {
      expect(safeNextPath(input)).toBe('/');
    },
  );
});

describe('isPublicPath', () => {
  it('allows login, auth callback and invite links', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/auth/callback')).toBe(true);
    expect(isPublicPath('/invite/abc')).toBe(true);
    expect(isPublicPath('/welcome')).toBe(true);
  });
  it('protects everything else', () => {
    expect(isPublicPath('/')).toBe(false);
    expect(isPublicPath('/loginx')).toBe(false);
    expect(isPublicPath('/place/1')).toBe(false);
  });
});
