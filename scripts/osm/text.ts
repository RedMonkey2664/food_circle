/** Same rules as the SQL normalize_name(): lowercase, & -> and, strip punctuation, collapse spaces. */
export function normalizeName(n: string): string {
  return n
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
