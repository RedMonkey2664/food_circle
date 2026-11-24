// One normaliser for the app and the import scripts (lib/domain/normalize.ts).
export { normalizeName } from '../../lib/domain/normalize';

/** Lowercase kebab slug: 'Bandra (West)' -> 'bandra-west'. ASCII only. */
export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
