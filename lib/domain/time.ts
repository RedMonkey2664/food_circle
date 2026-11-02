import { istDate } from '@/lib/date';

/**
 * Short age for cards ("today", "2d", "3w", "5mo", "1y") from an IST calendar date.
 * Visits are dated, not timed, so we never show hours.
 */
export function visitAge(visitedOn: string, now: Date = new Date()): string {
  const today = istDate(now);
  const days = Math.round((Date.parse(today) - Date.parse(visitedOn)) / 86_400_000);
  if (Number.isNaN(days) || days <= 0) return 'today';
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}
