import Image from 'next/image';
import { cn } from '@/lib/cn';
import { APP_NAME } from '@/lib/config';

/** The SKOOP mark (decorative; pair it with the name in text). */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/skoop-mark.webp"
      width={size}
      height={size}
      alt=""
      aria-hidden
      priority
      className={cn('shrink-0 select-none', className)}
    />
  );
}

/** Logo + name, for page headers. */
export function Brand({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        'font-display inline-flex items-center gap-2 font-bold tracking-tight',
        className,
      )}
    >
      <Logo size={size} />
      {APP_NAME}
    </span>
  );
}
