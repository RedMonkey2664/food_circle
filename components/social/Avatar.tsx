import { cn } from '@/lib/cn';

/**
 * Avatar with an initial fallback. Plain <img> on purpose: Google avatars are tiny and
 * already sized by URL, so the image optimizer would only add a hop.
 */
export function Avatar({
  name,
  url,
  size = 40,
  className,
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      aria-hidden
      className={cn(
        'bg-primary-soft text-primary font-display inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}
