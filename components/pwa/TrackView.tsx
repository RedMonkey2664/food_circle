'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

/** Records one allow-listed, anonymous event when a screen is shown (P7-07). */
export function TrackView({ name }: { name: 'recap_viewed' }) {
  useEffect(() => {
    track(name);
  }, [name]);
  return null;
}
