import Image from 'next/image';
import { cn } from '@/lib/cn';

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
