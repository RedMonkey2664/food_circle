// Product day is Asia/Kolkata (IST). Store UTC, reason about calendar days in IST.
export const PRODUCT_TZ = 'Asia/Kolkata';

const istDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: PRODUCT_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** IST calendar date as YYYY-MM-DD for the given instant (default: now). */
export function istDate(at: Date = new Date()): string {
  return istDateFormatter.format(at);
}

function parseYmd(ymd: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) throw new Error(`Invalid date: ${ymd}`);
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing the given IST calendar date. */
export function weekStart(ymd: string): string {
  const d = parseYmd(ymd);
  const dow = d.getUTCDay(); // 0 = Sunday
  const back = (dow + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return toYmd(d);
}

/** First day of the month containing the given IST calendar date. */
export function monthStart(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}
