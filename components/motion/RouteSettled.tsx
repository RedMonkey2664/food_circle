'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { notifyRouteSettled } from '@/lib/motion/circle-transition';

/**
 * Tells a running circle transition that the new route has committed to the DOM, so the
 * browser can take the "after" snapshot.
 *
 * Signal from the effect itself, NOT from requestAnimationFrame: while a view transition is
 * waiting for its update callback the browser suppresses rendering, so rAF callbacks never
 * run and the reveal would stall until the safety timeout.
 */
export function RouteSettled(): null {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    notifyRouteSettled();
  }, [pathname, search]);
  return null;
}
