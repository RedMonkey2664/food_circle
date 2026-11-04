import { describe, expect, it } from 'vitest';
import { deviceClass, routePattern } from './analytics';

describe('routePattern', () => {
  it('strips ids, usernames, codes and query strings', () => {
    expect(routePattern('/place/6f0c1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f?filter=everyone')).toBe(
      '/place/[id]',
    );
    expect(routePattern('/u/riya.eats')).toBe('/u/[user]');
    expect(routePattern('/u/riya.eats/followers')).toBe('/u/[user]/followers');
    expect(routePattern('/invite/abcdefghijklmnopqrstuvwx')).toBe('/invite/[code]');
    expect(routePattern('/s/abcdefghijklmnopqrstuvwx')).toBe('/s/[token]');
    expect(routePattern('/search')).toBe('/search');
  });
});

describe('deviceClass', () => {
  it('buckets by width only', () => {
    expect(deviceClass(390)).toBe('phone');
    expect(deviceClass(820)).toBe('tablet');
    expect(deviceClass(1440)).toBe('desktop');
  });
});
