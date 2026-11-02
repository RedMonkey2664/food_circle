'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, type ComponentProps, type MouseEvent } from 'react';
import { closeWithCircle, openWithCircle } from '@/lib/motion/circle-transition';

type LinkProps = Omit<ComponentProps<typeof Link>, 'href' | 'onClick'> & { href: string };

function isPlainClick(e: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.defaultPrevented
  );
}

/**
 * A link whose destination grows out of the link itself as a circle. Still a real <a>:
 * middle-click, open-in-new-tab and no-JS all work as normal links.
 */
export function CircleOpenLink({ href, ...props }: LinkProps) {
  const router = useRouter();
  // Warm the destination so the reveal shows the page, not its loading skeleton.
  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);
  return (
    <Link
      href={href}
      {...props}
      onClick={(e) => {
        if (!isPlainClick(e)) return;
        e.preventDefault();
        // Read at tap time (not via usePathname) so this link can sit in prerendered shells.
        const current = `${window.location.pathname}${window.location.search}`;
        openWithCircle(href, () => router.push(href), e.currentTarget, current);
      }}
    />
  );
}

/**
 * Leaves a takeover by shrinking it back into the point it opened from.
 * Goes to `href` if given, otherwise back to the page the takeover was opened from.
 */
export function CircleCloseLink({
  href,
  fallbackHref = '/',
  ...props
}: Omit<LinkProps, 'href'> & { href?: string; fallbackHref?: string }) {
  const router = useRouter();
  return (
    <Link
      href={href ?? fallbackHref}
      {...props}
      onClick={(e) => {
        if (!isPlainClick(e)) return;
        e.preventDefault();
        closeWithCircle((to) => router.push(to), e.currentTarget, { href, fallbackHref });
      }}
    />
  );
}
