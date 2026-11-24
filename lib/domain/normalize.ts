/** Same rules as the SQL normalize_name(): lowercase, & -> and, strip punctuation, collapse spaces. */
export function normalizeName(n: string): string {
  return n
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
